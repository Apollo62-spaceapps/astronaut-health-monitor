// Regras de radiação (SPEC §7, §6.2): R-RAD-01, R-RAD-02 e R-RAD-03.
// Funções PURAS: sem React, sem store, sem Date.now().
import { ENVIRONMENTS } from '@/domain/config/environments'
import type { Alert, MissionMode, Provenance, RadiationState, SpaceWeatherEvent } from '@/domain/types'

/** Limite de carreira [FATO, S03]. */
export const CAREER_LIMIT_MSV = 600

/** Texto exibido quando o ambiente não tem taxa de dose com fonte (ENV-04, P-16). */
export const RATE_NOT_SOURCED = 'rate not sourced for this environment'

export interface MissionDose {
  /** null = sem fonte para a taxa deste ambiente → NÃO mostrar número (ENV-04). */
  missionMSv: number | null
  rateMSvPerDay: number | null
  provenance: Provenance | null
  ruleId: 'R-RAD-02'
}

/**
 * R-RAD-02: dias de missão + ambiente → dose da missão.
 * Usa a taxa do ambiente (Spacecraft: 1,8 mSv/dia [S08, S09]). Taxa null → não soma número.
 */
export function missionDose(missionDay: number, mode: MissionMode): MissionDose {
  const env = ENVIRONMENTS[mode]
  const rate = env.doseRateMSvPerDay
  if (rate === null) return { missionMSv: null, rateMSvPerDay: null, provenance: null, ruleId: 'R-RAD-02' }
  return {
    missionMSv: Math.max(0, missionDay) * rate,
    rateMSvPerDay: rate,
    provenance: {
      kind: 'simulated',
      basis: 'S09',
      note: 'Simulated using MSL/RAD cruise average (galactic cosmic rays).',
    },
    ruleId: 'R-RAD-02',
  }
}

/** R-RAD-01: doses → % do limite de carreira de 600 mSv [S03]. */
export function careerDosePct(totalMSv: number, limitMSv: number = CAREER_LIMIT_MSV): number {
  if (limitMSv <= 0) return NaN
  return (totalMSv / limitMSv) * 100
}

export interface CareerDose {
  priorMSv: number
  missionMSv: number | null
  /** null quando a dose da missão não tem fonte (não inventa total). */
  totalMSv: number | null
  pctOfLimit: number | null
  limitMSv: number
  rateMSvPerDay: number | null
  provenance: Provenance | null
  ruleIds: readonly ['R-RAD-01', 'R-RAD-02']
}

/** R-RAD-01 + R-RAD-02: barra "Career dose" = (dose prévia + dose da missão) ÷ 600 mSv. */
export function careerDose(radiation: RadiationState, missionDay: number, mode: MissionMode): CareerDose {
  const m = missionDose(missionDay, mode)
  const total = m.missionMSv === null ? null : radiation.careerPriorMSv + m.missionMSv
  return {
    priorMSv: radiation.careerPriorMSv,
    missionMSv: m.missionMSv,
    totalMSv: total,
    pctOfLimit: total === null ? null : careerDosePct(total, radiation.careerLimitMSv),
    limitMSv: radiation.careerLimitMSv,
    rateMSvPerDay: m.rateMSvPerDay,
    provenance: m.provenance,
    ruleIds: ['R-RAD-01', 'R-RAD-02'],
  }
}

/** Fluxo de abrigo (RAD-04), adaptado do procedimento da Orion [S05]. */
export const SHELTER_STEPS = [
  'Open the designated shelter stowage compartments and take out the cargo bags.',
  'Place the bags to cover the least-protected areas (you have up to 1 hour to prepare).',
  'Stay in the shelter until cleared — this can take up to 24 hours.',
] as const

export const SHELTER_LABEL = 'Adapted from NASA Orion radiation shelter procedure.'

/** R-RAD-03: evento SEP ativo → alerta urgent com os 3 passos de abrigo [S05]. Sem evento ativo → null. */
export function shelterAlert(event: SpaceWeatherEvent | null, active: boolean, nowIso: string): Alert | null {
  if (!event || !active) return null
  return {
    id: `R-RAD-03:${event.sepID}`,
    ruleId: 'R-RAD-03',
    level: 'urgent',
    title: 'Solar particle event — take shelter',
    message: `Real event observed near Earth (NASA DONKI), replayed in this scenario: ${event.sepID}. ${SHELTER_LABEL}`,
    safeActions: [...SHELTER_STEPS],
    escalateTo: [],
    createdAt: nowIso,
  }
}
