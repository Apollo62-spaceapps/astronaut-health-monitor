import { describe, expect, it } from 'vitest'
import { buildAssistantContext, runEngine, visibleAlerts, type EngineInput } from '@/domain/rules/engine'
import { DEMO_SPACE_WEATHER_EVENT, demoScenario } from '@/data/scenario'
import { DEMO_MISSION_DAY, missionDayToIso } from '@/state/store'
import type { WellbeingEntry } from '@/domain/types'

const scen = demoScenario()
const input = (over: Partial<EngineInput> = {}): EngineInput => ({
  environment: 'SPACECRAFT',
  role: 'ASTRONAUT',
  vitals: scen.vitals,
  preflight: scen.preflight,
  wellbeing: scen.wellbeing,
  exercise: scen.exercise,
  radiation: scen.radiation,
  missionDay: DEMO_MISSION_DAY,
  simNowIso: missionDayToIso(DEMO_MISSION_DAY),
  spaceWeatherEvent: DEMO_SPACE_WEATHER_EVENT,
  eventReplayed: false,
  shelterActive: false,
  consent: { shareWellbeingAlertsWithCmo: false },
  breakGlass: { active: false },
  ...over,
})

const lowMood: WellbeingEntry[] = ['2026-11-12', '2026-11-13', '2026-11-14'].map((date) => ({
  date,
  mood: 1,
  sleepHours: 7,
}))

describe('engine · cenário da demo (dia 120, Spacecraft)', () => {
  const out = runEngine(input())

  it('todo alerta tem ruleId (rastreabilidade)', () => {
    expect(out.alerts.length).toBeGreaterThan(0)
    for (const a of out.alerts) expect(a.ruleId).toMatch(/^R-[A-Z]+-\d+$/)
  })

  it('FC +18% → alerta attention e Heart em attention', () => {
    expect(out.alerts.find((a) => a.id.startsWith('R-VIT-02:heartRate'))?.level).toBe('attention')
    expect(out.body.heart).toBe('attention')
  })

  it('dose: 216 mSv de missão; adesão 86%', () => {
    expect(out.radiation.missionMSv).toBeCloseTo(216)
    expect(Math.round(out.exercise.adherence.pct!)).toBe(86)
  })

  it('escalonamento usa o ambiente: ~40 min na Spacecraft, imediato na Earth', () => {
    expect(out.escalation.etaGroundReplySec).toBe(2400)
    expect(runEngine(input({ environment: 'EARTH' })).escalation.replyText).toBe('Flight surgeon available now.')
  })
})

describe('engine · evento solar', () => {
  it('replay + abrigo → urgent R-RAD-03 no topo e exercício de hoje adiado', () => {
    const sessions = scen.exercise.map((s) =>
      s.date === '2026-11-14' ? { ...s, status: 'skipped' as const, doneMin: 0 } : s,
    )
    const out = runEngine(input({ eventReplayed: true, shelterActive: true, exercise: sessions }))
    expect(out.alerts[0]!.ruleId).toBe('R-RAD-03')
    expect(out.worstLevel).toBe('urgent')
    expect(out.escalation.priority).toBe('priority')
    expect(out.exercise.sessions.filter((s) => s.date === '2026-11-14').every((s) => s.status === 'postponed')).toBe(
      true,
    )
  })
})

describe('engine · privacidade do bem-estar', () => {
  it('alerta R-MH-01 não vai ao CMO sem consentimento', () => {
    const out = runEngine(input({ wellbeing: lowMood }))
    const mh = out.alerts.find((a) => a.ruleId === 'R-MH-01')!
    expect(mh.escalateTo).not.toContain('CMO')
    const withConsent = runEngine(input({ wellbeing: lowMood, consent: { shareWellbeingAlertsWithCmo: true } }))
    expect(withConsent.alerts.find((a) => a.ruleId === 'R-MH-01')!.escalateTo).toContain('CMO')
  })

  it('CMO sem consentimento: Head restricted e alerta de bem-estar oculto (inclusive no assistente)', () => {
    const i = input({ role: 'CMO', wellbeing: lowMood })
    const out = runEngine(i)
    expect(out.body.head).toBe('restricted')
    expect(visibleAlerts(out.alerts, out.privacy).some((a) => a.ruleId === 'R-MH-01')).toBe(false)
    expect(buildAssistantContext(i, out).activeAlerts.some((a) => a.ruleId === 'R-MH-01')).toBe(false)
  })

  it('o assistente recebe o ambiente e o resumo dos vitais (ENV-05)', () => {
    const ctx = buildAssistantContext(input({ environment: 'LUNAR' }))
    expect(ctx.missionMode).toBe('LUNAR')
    expect(ctx.vitalsSummary.find((v) => v.kind === 'heartRate')).toMatchObject({
      deviationPct: 18,
      status: 'attention',
    })
  })
})

describe('engine · L5 (P1)', () => {
  it('Legs recebe o nível da adesão (86% → normal)', () => {
    expect(runEngine(input()).body.legs).toBe('normal')
  })

  it('logo depois de trocar de gravidade, Heart attention vira adapting; urgent não', () => {
    const now = missionDayToIso(DEMO_MISSION_DAY)
    expect(runEngine(input({ gravityChangeIso: now })).body.heart).toBe('adapting')
    const urgentHr = [
      ...scen.vitals,
      { ...scen.vitals.at(-1)!, kind: 'heartRate' as const, value: 120, unit: 'bpm' as const, takenAt: now },
    ]
    expect(runEngine(input({ gravityChangeIso: now, vitals: urgentHr })).body.heart).toBe('urgent')
  })
})
