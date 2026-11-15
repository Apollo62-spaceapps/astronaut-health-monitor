import type { Alert, MissionMode, RadiationState, SpaceWeatherEvent } from '@/domain/types'
import { ENVIRONMENTS } from '@/domain/config/environments'

/** R-RAD-01: career dose as a share of the sourced 600 mSv limit. */
export function careerDosePercent(priorDoseMSv: number, missionDoseMSv: number, limitMSv = 600): number {
  return ((priorDoseMSv + missionDoseMSv) / limitMSv) * 100
}

/** R-RAD-02: null rate means no sourced increment for this environment. */
export function missionDoseForEnvironment(days: number, mode: MissionMode): number | null {
  const rate = ENVIRONMENTS[mode].doseRateMSvPerDay
  return rate === null ? null : days * rate
}

/** R-RAD-03: replayed SEP creates the deterministic shelter alert. */
export function radiationShelterAlert(event: SpaceWeatherEvent | null, active: boolean, at: string): Alert | null {
  if (!event || !active) return null
  return {
    id: `rad-${event.sepID}`,
    ruleId: 'R-RAD-03',
    level: 'urgent',
    title: 'Radiation shelter active',
    message: 'A space weather event has been replayed in this scenario.',
    safeActions: [
      'Open the designated shelter compartments and remove the cargo bags.',
      'Position the bags to cover the least protected areas (up to 1 hour to prepare).',
      'Shelter until release; this may take up to 24 hours.',
    ],
    escalateTo: ['CMO', 'FLIGHT_SURGEON'],
    createdAt: at,
  }
}

export function careerDose(state: RadiationState, missionDoseMSv: number | null) {
  return missionDoseMSv === null ? null : {
    totalMSv: state.careerPriorMSv + missionDoseMSv,
    percent: careerDosePercent(state.careerPriorMSv, missionDoseMSv, state.careerLimitMSv),
  }
}
