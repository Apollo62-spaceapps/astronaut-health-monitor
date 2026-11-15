// Utilitário de TESTE (L7): monta o contexto do Orbit a partir do cenário da demo, sem React e sem store.
import { buildOrbitContext, type OrbitContext } from '@/ai/context'
import { demoScenario } from '@/data/scenario'
import { runEngine, type EngineInput } from '@/domain/rules/engine'
import type { MissionMode, OutboundPacket, Role } from '@/domain/types'
import { deriveInsights } from '@/state/insights'
import { DEMO_MISSION_DAY, missionDayToIso } from '@/state/store'

export interface TestScenario {
  environment?: MissionMode
  role?: Role
  shelter?: boolean
  gravityChangeIso?: string | null
  breakGlass?: boolean
  outbox?: OutboundPacket[]
  patch?: (input: EngineInput) => EngineInput
}

export function testInput(s: TestScenario = {}): EngineInput {
  const data = demoScenario()
  const input: EngineInput = {
    environment: s.environment ?? 'SPACECRAFT',
    role: s.role ?? 'ASTRONAUT',
    vitals: data.vitals,
    preflight: data.preflight,
    wellbeing: data.wellbeing,
    exercise: data.exercise,
    radiation: data.radiation,
    missionDay: DEMO_MISSION_DAY,
    simNowIso: missionDayToIso(DEMO_MISSION_DAY),
    spaceWeatherEvent: data.spaceWeatherEvent,
    eventReplayed: !!s.shelter,
    shelterActive: !!s.shelter,
    consent: { shareWellbeingAlertsWithCmo: false },
    breakGlass: { active: !!s.breakGlass },
    gravityChangeIso: s.gravityChangeIso ?? null,
  }
  return s.patch ? s.patch(input) : input
}

export function testContext(s: TestScenario = {}): OrbitContext {
  const input = testInput(s)
  const out = runEngine(input)
  const data = demoScenario()
  return buildOrbitContext(input, out, deriveInsights(input, out), { routine: data.routine, outbox: s.outbox ?? [] })
}
