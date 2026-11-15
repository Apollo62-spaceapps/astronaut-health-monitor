// L7 §5A/§5B/§5C: R-REF-01 (referência), R-TREND-01 (tendência), R-RISK-01 (outlook) e configs com fonte.
import { describe, expect, it } from 'vitest'
import { baselineQuality, referenceFor, referenceTransition } from '@/domain/rules/reference'
import { trendFromSeries } from '@/domain/rules/trend'
import { crewOutlook, viewOutlook, type CrewMemberInput } from '@/domain/rules/risk'
import { RISK_EVENTS } from '@/domain/config/riskEvents'
import { SSM_SCHEDULE } from '@/domain/config/ssmSchedule'
import { NO_SOURCED_SHIFT } from '@/domain/config/referenceShifts'
import { vitalLevel } from '@/domain/rules/vitals'
import { SOURCES } from '@/data/sources'
import { SYNTHETIC_CREW } from '@/data/crew'
import type { VitalReading } from '@/domain/types'

const DAY = 24 * 3600 * 1000
const r = (value: number, day: number): VitalReading => ({
  kind: 'heartRate',
  value,
  unit: 'bpm',
  takenAt: new Date(Date.parse('2026-07-01T07:30:00Z') + day * DAY).toISOString(),
  provenance: { kind: 'simulated' },
})
const pre = Array.from({ length: 14 }, (_, i) => r(70, -20 + i))
const nowIso = (day: number) => new Date(Date.parse('2026-07-01T12:00:00Z') + day * DAY).toISOString()

describe('R-REF-01 — referência pessoal', () => {
  it('baseline com poucos dias ⇒ Low-confidence', () => {
    expect(baselineQuality('heartRate', pre)!.lowConfidence).toBe(false)
    expect(baselineQuality('heartRate', pre.slice(0, 3))!.lowConfidence).toBe(true)
  })

  it('na Terra (retorno) compara com o pré-voo', () => {
    const ref = referenceFor({
      kind: 'heartRate',
      preflight: pre,
      readings: [r(80, 5)],
      environment: 'EARTH',
      nowIso: nowIso(5),
      gravityChangeIso: nowIso(4),
    })!
    expect(ref.origin).toBe('pre-flight')
    expect(ref.referenceValue).toBeCloseTo(70)
    expect(ref.shiftNote).toBeNull()
  })

  it('dentro da janela de adaptação ⇒ adapting (pré-voo); depois ⇒ reconstruída no ambiente', () => {
    const readings = [r(76, 1), r(77, 2), r(78, 3), r(78, 4), r(79, 5)]
    const during = referenceFor({
      kind: 'heartRate',
      preflight: pre,
      readings,
      environment: 'LUNAR',
      nowIso: nowIso(2),
      gravityChangeIso: nowIso(0.9),
    })!
    expect(during.origin).toBe('adapting')
    const after = referenceFor({
      kind: 'heartRate',
      preflight: pre,
      readings,
      environment: 'LUNAR',
      nowIso: nowIso(5),
      gravityChangeIso: nowIso(0.5),
    })!
    expect(after.origin).toBe('adapted')
    expect(after.referenceValue).toBeGreaterThan(75)
  })

  it('ambiente sem fonte de shift ⇒ sem número, só o texto (ENV-04)', () => {
    const ref = referenceFor({
      kind: 'heartRate',
      preflight: pre,
      readings: [r(72, 1)],
      environment: 'ISS',
      nowIso: nowIso(1),
      gravityChangeIso: null,
    })!
    expect(ref.shift).toBeUndefined()
    expect(ref.shiftNote).toBe(NO_SOURCED_SHIFT)
  })

  it('transições: retorno à Terra compara com o pré-voo; mesma gravidade não abre janela', () => {
    expect(referenceTransition('SPACECRAFT', 'EARTH')).toMatchObject({
      kind: 'return-to-earth',
      comparesWith: 'preflight',
      opensWindow: true,
    })
    expect(referenceTransition('SPACECRAFT', 'LUNAR').kind).toBe('microgravity-to-partial')
    expect(referenceTransition('SPACECRAFT', 'ISS').opensWindow).toBe(false)
    expect(referenceTransition('SPACECRAFT', 'LUNAR').text).not.toMatch(/\d\.\d+ ?g|1\/6/)
  })
})

describe('R-TREND-01 — tendência silenciosa', () => {
  const ref = { value: 70, comparedTo: 'preflight' as const }
  it('3 dias seguidos no mesmo sentido ⇒ attention "trend"; nunca urgent', () => {
    const t = trendFromSeries('heartRate', [70, 71, 72, 74], ref)!
    expect(t).toMatchObject({ direction: 'up', days: 3, level: 'attention' })
    expect(trendFromSeries('heartRate', [70, 90, 110, 130, 150], ref)!.level).toBe('attention')
  })
  it('ruído alternado não dispara; voltar para a referência não é drift', () => {
    expect(trendFromSeries('heartRate', [70, 72, 70, 72, 70, 72], ref)).toBeNull()
    expect(trendFromSeries('heartRate', [80, 78, 76, 74], ref)).toBeNull()
    expect(trendFromSeries('heartRate', [70, 71, 71, 72], ref)).toBeNull()
  })
})

const member = (p: Partial<CrewMemberInput>): CrewMemberInput => ({
  id: 'X',
  name: 'Crew X',
  isSelf: false,
  solarEventActive: false,
  groundReplySec: 0,
  adapting: false,
  provenance: 'SIMULATED',
  ...p,
})
const hr = (latest: number, preflightMean: number) => ({
  latest,
  preflightMean,
  level: vitalLevel('heartRate', ((latest - preflightMean) / preflightMean) * 100),
})

describe('R-RISK-01 — Crew Risk Outlook', () => {
  it('mesmo valor, referências diferentes ⇒ níveis diferentes (demo do Kayque)', () => {
    const b = crewOutlook(member({ hr: hr(78, 68) }))
    const c = crewOutlook(member({ hr: hr(78, 76) }))
    expect(b.level).toBe('elevated')
    expect(c.level).toBe('low')
    const fb = SYNTHETIC_CREW.find((x) => x.id === 'B')!
    const fc = SYNTHETIC_CREW.find((x) => x.id === 'C')!
    expect(fb.hr.series.at(-1)).toBe(fc.hr.series.at(-1))
  })
  it('Adapting não vira risco alto; urgent nunca é mascarado', () => {
    expect(crewOutlook(member({ hr: hr(78, 68), adapting: true })).level).toBe('low')
    expect(crewOutlook(member({ hr: hr(90, 68), adapting: true })).level).toBe('high')
  })
  it('evento solar ⇒ High (radiação); atraso longo ⇒ Guarded (distância)', () => {
    expect(crewOutlook(member({ solarEventActive: true }))).toMatchObject({ level: 'high', hazard: 'radiation' })
    expect(crewOutlook(member({ groundReplySec: 2400 }))).toMatchObject({ level: 'guarded', hazard: 'distance' })
  })
  it('privacidade: astronauta vê só o nível do colega; CMO vê humor/sono como Restricted; FS vê tudo', () => {
    const o = crewOutlook(member({ sleepHours: [4.5, 4.6, 4.7], mood: [2, 2, 2] }))
    const p = (role: 'ASTRONAUT' | 'CMO' | 'FLIGHT_SURGEON', breakGlassActive = false) => ({
      role,
      consentShareWellbeingAlerts: false,
      breakGlassActive,
    })
    expect(viewOutlook(o, p('ASTRONAUT')).drivers).toBeNull()
    expect(viewOutlook(o, p('CMO')).drivers!.every((d) => 'restricted' in d)).toBe(true)
    expect(viewOutlook(o, p('CMO', true)).drivers!.some((d) => 'restricted' in d)).toBe(false)
    expect(viewOutlook(o, p('FLIGHT_SURGEON')).drivers!.some((d) => 'restricted' in d)).toBe(false)
    expect(viewOutlook(o, p('CMO')).level).toBe(o.level)
  })
})

describe('configs com fonte (§5C)', () => {
  const ids = new Set(SOURCES.map((s) => s.id))
  it('todo evento de risco e toda linha do cronograma têm fonte do catálogo', () => {
    for (const e of RISK_EVENTS) {
      expect(e.sourceIds.length, e.id).toBeGreaterThan(0)
      for (const id of e.sourceIds) expect(ids.has(id), id).toBe(true)
      expect(e.mappingBasis).toBe('team-proposal')
    }
    for (const row of SSM_SCHEDULE) for (const id of row.sourceIds) expect(ids.has(id), id).toBe(true)
  })
  it('S22–S28 (Standard Measures) no catálogo, sem palavra proibida', () => {
    for (const id of ['S22', 'S23', 'S24', 'S25', 'S26', 'S27', 'S28'])
      expect(ids.has(id as `S${number}`), id).toBe(true)
    const text = JSON.stringify([RISK_EVENTS, SSM_SCHEDULE])
    expect(text).not.toMatch(/\b(fit|unfit|healthy|diagnos\w*)\b/i)
  })
})
