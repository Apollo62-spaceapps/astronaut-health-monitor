// R-RISK-01 — Crew Risk Outlook (L7, Orbit §5A). Função PURA.
// NÃO é previsão de acidente nem diagnóstico: diz que a combinação de fatores observados aumenta a exposição a
// um hazard do NASA HRP (S19). Níveis Low / Guarded / Elevated / High (mapeados para os tokens de status do DS,
// sempre cor + ícone + texto). Pesos e limiares em config/thresholds.ts (PENDENTE P-01 — valores ilustrativos).
// Regras de segurança:
// - urgent nunca é mascarado (um vital urgent leva o tripulante a High);
// - na janela de adaptação (R-PHASE-01), um desvio attention ligado à gravidade vira "adapting" e não sobe o risco;
// - privacidade (R-PRIV-01): `viewOutlook` esconde o que o perfil não pode ver; o nível é o mesmo para todos.
import { CAREER_DOSE_PCT, RISK_DRIVERS } from '@/domain/config/thresholds'
import { canView, type PrivacyContext } from '@/domain/rules/privacy'
import type { Trend } from '@/domain/rules/trend'
import type { AlertLevel, Hazard, SourceId } from '@/domain/types'

export type RiskLevel = 'low' | 'guarded' | 'elevated' | 'high'
export const RISK_LEVELS: readonly RiskLevel[] = ['low', 'guarded', 'elevated', 'high']

export type DriverId = 'restingHR' | 'drift' | 'sleep' | 'mood' | 'dose' | 'solarEvent' | 'exercise' | 'commDelay'

/** Ordem de desempate do hazard principal. */
const HAZARD_ORDER: readonly Hazard[] = ['radiation', 'gravity', 'isolation', 'hostileEnvironment', 'distance']

export interface RiskDriver {
  id: DriverId
  label: string
  hazard: Hazard
  /** 0 = não contribui; 1 Guarded; 2 Elevated; 3 High. */
  score: 0 | 1 | 2 | 3
  /** Valor e desvio como texto curto, ex.: "84 bpm · +18% vs pre-flight". */
  valueText: string
  provenance: 'REAL' | 'SIMULATED'
  sourceIds: SourceId[]
  /** Humor e sono: dado privado (R-PRIV-01). */
  private: boolean
  /** Desvio attention ligado à gravidade dentro da janela de adaptação: mostrado como Adapting, sem somar. */
  adapting?: boolean
}

export interface CrewMemberInput {
  id: string
  name: string
  isSelf: boolean
  hr?: { latest: number; preflightMean: number; level: AlertLevel }
  trend?: Trend | null
  /** Últimos registros (até 3 são usados). */
  sleepHours?: readonly number[]
  mood?: readonly number[]
  /** % do limite de carreira; null = taxa sem fonte no ambiente (não inventa número). */
  dosePct?: number | null
  solarEventActive: boolean
  adherencePct?: number | null
  postponedSessions?: number
  groundReplySec: number
  /** Dentro da janela de adaptação à gravidade (R-PHASE-01). */
  adapting: boolean
  provenance: 'SIMULATED'
}

export interface CrewOutlook {
  id: string
  name: string
  isSelf: boolean
  level: RiskLevel
  /** Hazard que puxou o nível (null quando Low). */
  hazard: Hazard | null
  /** Do maior para o menor score; só os que contribuem ou estão em adaptação. */
  drivers: RiskDriver[]
  hazardLevels: Record<Hazard, RiskLevel>
  ruleId: 'R-RISK-01'
  illustrativeThresholds: true
}

const toLevel = (score: number): RiskLevel => RISK_LEVELS[Math.max(0, Math.min(3, score))]!
const avg3 = (xs: readonly number[] | undefined) => {
  const last = (xs ?? []).slice(-3)
  return last.length ? last.reduce((a, b) => a + b, 0) / last.length : null
}
const round1 = (x: number) => Math.round(x * 10) / 10
const signed = (x: number) => `${x >= 0 ? '+' : '-'}${Math.abs(Math.round(x))}%`

/** Drivers de um tripulante (com score 0 incluídos; a saída final filtra). */
export function riskDrivers(m: CrewMemberInput): RiskDriver[] {
  const d: RiskDriver[] = []
  const sim = { provenance: 'SIMULATED' as const }

  if (m.hr) {
    const dev = ((m.hr.latest - m.hr.preflightMean) / m.hr.preflightMean) * 100
    const raw = m.hr.level === 'urgent' ? 3 : m.hr.level === 'attention' ? 2 : 0
    // R-PHASE-01: attention na adaptação não sobe o risco; urgent nunca é mascarado.
    const adapting = m.adapting && m.hr.level === 'attention'
    d.push({
      id: 'restingHR',
      label: 'Resting heart rate',
      hazard: 'gravity',
      score: (adapting ? 0 : raw) as RiskDriver['score'],
      valueText: `${Math.round(m.hr.latest)} bpm · ${signed(dev)} vs pre-flight`,
      sourceIds: ['S19'],
      private: false,
      ...(adapting ? { adapting: true } : {}),
      ...sim,
    })
  }
  if (m.trend) {
    d.push({
      id: 'drift',
      label: 'Drift from reference',
      hazard: 'gravity',
      score: 1,
      valueText: `${m.trend.direction} ${round1(Math.abs(m.trend.slopePerDay))}/day for ${m.trend.days} days`,
      sourceIds: [],
      private: false,
      ...sim,
    })
  }
  const sleep = avg3(m.sleepHours)
  if (sleep !== null) {
    d.push({
      id: 'sleep',
      label: 'Sleep',
      hazard: 'hostileEnvironment',
      score: sleep < RISK_DRIVERS.sleepElevatedBelowH ? 2 : sleep < RISK_DRIVERS.sleepGuardedBelowH ? 1 : 0,
      valueText: `${round1(sleep)} h average, last 3 nights`,
      sourceIds: ['S23'],
      private: true,
      ...sim,
    })
  }
  const mood = avg3(m.mood)
  if (mood !== null) {
    d.push({
      id: 'mood',
      label: 'Mood (self-report)',
      hazard: 'isolation',
      score: mood <= RISK_DRIVERS.moodElevatedAtOrBelow ? 2 : mood <= RISK_DRIVERS.moodGuardedAtOrBelow ? 1 : 0,
      valueText: `${round1(mood)} of 5 average, last 3 days`,
      sourceIds: ['S19'],
      private: true,
      ...sim,
    })
  }
  if (m.dosePct !== undefined && m.dosePct !== null) {
    d.push({
      id: 'dose',
      label: 'Career radiation dose',
      hazard: 'radiation',
      score:
        m.dosePct >= CAREER_DOSE_PCT.urgent
          ? 3
          : m.dosePct >= CAREER_DOSE_PCT.attention
            ? 2
            : m.dosePct >= RISK_DRIVERS.doseGuardedPct
              ? 1
              : 0,
      valueText: `${Math.round(m.dosePct)}% of the 600 mSv career limit`,
      sourceIds: ['S03'],
      private: false,
      ...sim,
    })
  }
  if (m.solarEventActive) {
    d.push({
      id: 'solarEvent',
      label: 'Solar particle event',
      hazard: 'radiation',
      score: 3,
      valueText: 'Active · shelter procedure',
      sourceIds: ['S07', 'S05'],
      private: false,
      provenance: 'REAL',
    })
  }
  const lowAdherence =
    m.adherencePct !== undefined && m.adherencePct !== null && m.adherencePct < RISK_DRIVERS.adherenceGuardedBelowPct
  if (m.adherencePct !== undefined || m.postponedSessions) {
    d.push({
      id: 'exercise',
      label: 'Exercise',
      hazard: 'gravity',
      score: lowAdherence || (m.postponedSessions ?? 0) > 0 ? 1 : 0,
      valueText: [
        m.adherencePct === null || m.adherencePct === undefined ? null : `${Math.round(m.adherencePct)}% adherence`,
        m.postponedSessions ? `${m.postponedSessions} postponed` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      sourceIds: ['S19'],
      private: false,
      ...sim,
    })
  }
  if (m.groundReplySec > 0) {
    const min = m.groundReplySec >= 60
    d.push({
      id: 'commDelay',
      label: 'Communication delay',
      hazard: 'distance',
      score: m.groundReplySec >= RISK_DRIVERS.longDelaySec ? 1 : 0,
      valueText: `Ground reply ~${min ? Math.round(m.groundReplySec / 60) : round1(m.groundReplySec)} ${min ? 'min' : 's'}`,
      sourceIds: ['S10'],
      private: false,
      ...sim,
    })
  }
  return d
}

/**
 * R-RISK-01: nível por hazard = maior score dos drivers do hazard, +1 quando dois ou mais drivers do mesmo
 * hazard estão em Elevated (score ≥ 2). Nível do tripulante = pior hazard (como R-BODY-01).
 */
export function crewOutlook(m: CrewMemberInput): CrewOutlook {
  const drivers = riskDrivers(m)
  const hazardLevels = {} as Record<Hazard, RiskLevel>
  let worst = 0
  let hazard: Hazard | null = null
  for (const h of HAZARD_ORDER) {
    const scores = drivers.filter((x) => x.hazard === h).map((x) => x.score)
    const max = scores.length ? Math.max(...scores) : 0
    const score = Math.min(3, max + (scores.filter((s) => s >= 2).length >= 2 ? 1 : 0))
    hazardLevels[h] = toLevel(score)
    if (score > worst) {
      worst = score
      hazard = h
    }
  }
  return {
    id: m.id,
    name: m.name,
    isSelf: m.isSelf,
    level: toLevel(worst),
    hazard,
    drivers: drivers.filter((x) => x.score > 0 || x.adapting).sort((a, b) => b.score - a.score),
    hazardLevels,
    ruleId: 'R-RISK-01',
    illustrativeThresholds: true,
  }
}

export interface VisibleOutlook extends Omit<CrewOutlook, 'drivers'> {
  /** null = o perfil só vê o nível (astronauta olhando um colega). */
  drivers: (RiskDriver | { id: DriverId; label: string; restricted: true })[] | null
}

/**
 * R-PRIV-01 aplicada ao outlook:
 * - astronauta: detalhe completo do próprio, só o nível (e o hazard) dos colegas;
 * - CMO: drivers da tripulação, mas humor e sono aparecem "Restricted" sem break-glass;
 * - Flight Surgeon: tudo (auditado).
 */
export function viewOutlook(o: CrewOutlook, viewer: PrivacyContext): VisibleOutlook {
  if (viewer.role === 'ASTRONAUT' && !o.isSelf) return { ...o, drivers: null }
  const own = viewer.role === 'ASTRONAUT' && o.isSelf
  return {
    ...o,
    drivers: o.drivers.map((x) =>
      x.private && !own && !canView('wellbeingDetail', viewer)
        ? { id: x.id, label: x.label, restricted: true as const }
        : x,
    ),
  }
}
