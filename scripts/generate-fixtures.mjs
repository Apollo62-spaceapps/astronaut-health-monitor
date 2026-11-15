// Gera os fixtures [SIMULATED] com semente fixa (K3 #43, SPEC §9). Rodar: npm run fixtures
// Mesmo resultado sempre (determinístico). Não usa dados reais de astronautas.
// As séries são ruído em torno do baseline + um desvio ROTEIRIZADO para a demo (rotulado),
// calibrado para reproduzir a tela de referência do docs/DESIGN-SYSTEM.md (dia 120:
// FC 84 bpm ≈ +18%, PA 121/79, dose 36% de 600 mSv, adesão 86% com sequência de 6 dias).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fixtures')
const SEED = 62 // Apollo 62
const MISSION_START_MS = Date.parse('2026-07-17T00:00:00.000Z') // igual a src/state/store.ts
const DAY_MS = 86_400_000
const DEMO_DAY = 120

// PRNG determinístico (mulberry32) + normal (Box-Muller)
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(SEED)
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
const round = (v, d) => Number(v.toFixed(d))
const iso = (day, hour = 8, min = 0) => new Date(MISSION_START_MS + day * DAY_MS + (hour * 60 + min) * 60_000).toISOString()
const date = (day) => iso(day).slice(0, 10)

const SIM = (note) => ({ kind: 'simulated', note })

// ── Astronauta fictício ──
const astronaut = {
  id: 'astro-1',
  name: 'Cdr. A. Nova',
  crewRole: 'Commander (fictional crew member)',
  missionDay: DEMO_DAY,
  careerPriorMSv: 0, // primeira missão (fictícia): 120 dias × 1,8 = 216 mSv = 36% de 600 (tela de referência)
  provenance: SIM('Fictional astronaut generated for the demo'),
}

// ── Sinais vitais ──
// `mean` = média-alvo do pré-voo (o pré-voo é centralizado nela), para o dia 120 bater com a tela
// de referência: 84 / 71,2 = +18,0% (FC) e 121 / 118,6 = +2,0% (PA sistólica).
const VITALS = {
  heartRate: { unit: 'bpm', mean: 71.2, sd: 2.2, d: 0 },
  systolicBP: { unit: 'mmHg', mean: 118.6, sd: 3.5, d: 0 },
  diastolicBP: { unit: 'mmHg', mean: 77.5, sd: 2.5, d: 0 },
  glucose: { unit: 'mg/dL', mean: 92, sd: 4.5, d: 0 },
  bodyTemp: { unit: '°C', mean: 36.7, sd: 0.12, d: 1 },
}
/** Desvio roteirizado da demo (SIMULATED): FC sobe nos últimos dias até 84 bpm no dia 120. */
function scripted(kind, day) {
  if (kind === 'heartRate' && day >= 116) return { 116: 76, 117: 78, 118: 80, 119: 82, 120: 84 }[day]
  if (kind === 'systolicBP' && day === DEMO_DAY) return 121
  if (kind === 'diastolicBP' && day === DEMO_DAY) return 79
  return undefined
}
const preflight = []
const inflight = []
for (const [kind, v] of Object.entries(VITALS)) {
  // Pré-voo: 14 medições com ruído, centralizadas na média-alvo (sem arredondar antes de centralizar)
  const raw = Array.from({ length: 14 }, () => v.mean + gauss() * v.sd)
  const shift = v.mean - raw.reduce((a, b) => a + b, 0) / raw.length
  raw.forEach((x, i) => {
    preflight.push({ kind, value: round(x + shift, 2), unit: v.unit, takenAt: iso(i - 14, 7, 30), provenance: SIM('Pre-flight exam (fictional)') })
  })
  for (let day = 1; day <= DEMO_DAY; day++) {
    const s = scripted(kind, day)
    const value = s ?? round(v.mean + gauss() * v.sd, v.d)
    inflight.push({
      kind,
      value,
      unit: v.unit,
      takenAt: iso(day, 7, 30),
      provenance: SIM(s !== undefined ? 'Scripted deviation for the demo' : 'Synthetic noise around the pre-flight baseline'),
    })
  }
}

// ── Bem-estar (DADO RESTRITO): últimos 30 dias ──
const wellbeing = []
for (let day = DEMO_DAY - 29; day <= DEMO_DAY; day++) {
  const mood = Math.min(5, Math.max(1, Math.round(4 + gauss() * 0.6 - (day > DEMO_DAY - 3 ? 1 : 0))))
  wellbeing.push({ date: date(day), mood, sleepHours: round(6.6 + gauss() * 0.4, 1) })
}

// ── Exercício: plano ~2 h/dia [S13], distribuição entre equipamentos [SIMULATED] ──
const PLAN = [
  { device: 'ARED', prescribedMin: 45 },
  { device: 'T2', prescribedMin: 40 },
  { device: 'CEVIS', prescribedMin: 35 },
]
const exercise = []
for (let day = DEMO_DAY - 29; day <= DEMO_DAY; day++) {
  for (const p of PLAN) {
    // Dia 114 pulado: últimos 6 dias completos → sequência de 6 dias e adesão semanal 720/840 ≈ 86%
    const skipped = day === DEMO_DAY - 6
    const partial = !skipped && day < DEMO_DAY - 6 && rand() < 0.12
    const doneMin = skipped ? 0 : partial ? Math.round(p.prescribedMin * 0.6) : p.prescribedMin
    exercise.push({ date: date(day), device: p.device, prescribedMin: p.prescribedMin, doneMin, status: skipped ? 'skipped' : partial ? 'partial' : 'done', selfReported: true })
  }
}

// ── Rotina da missão por ambiente (adendo §18) — horários e itens [SIMULATED] ──
const ALL = ['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT']
const sim = SIM('Illustrative mission routine')
const routine = [
  { id: 'r-hr', title: 'Measure resting heart rate', kind: 'measure', vital: 'heartRate', time: '07:30', environments: ALL },
  { id: 'r-bp', title: 'Measure blood pressure', kind: 'measure', vital: 'systolicBP', time: '07:35', environments: ALL },
  { id: 'r-glu', title: 'Measure blood glucose', kind: 'measure', vital: 'glucose', time: '07:40', environments: ALL },
  { id: 'r-temp', title: 'Measure body temperature', kind: 'measure', vital: 'bodyTemp', time: '07:45', environments: ALL },
  { id: 'r-ex-iss', title: 'Exercise session (ARED · T2 · CEVIS)', kind: 'exercise', time: '10:00', environments: ['ISS'] },
  { id: 'r-ex-hab', title: 'Exercise session (habitat equipment, simulated)', kind: 'exercise', time: '10:00', environments: ['LUNAR', 'SPACECRAFT'] },
  { id: 'r-ex-earth', title: 'Ground training session', kind: 'exercise', time: '10:00', environments: ['EARTH'] },
  { id: 'r-maint', title: 'Spacecraft maintenance (docked at the station)', kind: 'maintenance', time: '14:00', environments: ['ISS'] },
  { id: 'r-wb', title: 'Wellbeing check-in (private)', kind: 'checkin', time: '21:00', environments: ALL },
].map((r) => ({ ...r, status: 'due', provenance: sim }))

// ── Gravar (ou conferir com --check) ──
const files = {
  'astronaut.json': astronaut,
  'vitals.json': { preflight, inflight },
  'wellbeing.json': wellbeing,
  'exercise.json': exercise,
  'routine.json': routine,
}
mkdirSync(OUT, { recursive: true })
const check = process.argv.includes('--check')
let diff = 0
for (const [name, data] of Object.entries(files)) {
  const text = JSON.stringify(data, null, 2) + '\n'
  const path = join(OUT, name)
  if (check) {
    let cur = ''
    try { cur = readFileSync(path, 'utf8') } catch { /* arquivo ausente */ }
    if (cur.replace(/\r\n/g, '\n') !== text) { console.log(`diferente: ${name}`); diff++ }
  } else writeFileSync(path, text)
}
if (check) { console.log(diff ? `${diff} arquivo(s) fora do gerador` : 'fixtures conferem com o gerador'); process.exit(diff ? 1 : 0) }
console.log(`fixtures gravados em ${OUT} (semente ${SEED})`)
