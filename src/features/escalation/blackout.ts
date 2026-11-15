// Apagão de comunicação (ESC-05, P1). Função pura: sem React, sem store.
// A NASA cita apagões de até 2–3 semanas perto da conjunção solar, no trânsito para Marte [S10, S11].
// Só a Spacecraft (trânsito) tem apagão com fonte; nos outros ambientes o interruptor não aparece e não vale.
import type { MissionMode } from '@/domain/types'

export const BLACKOUT_ENVIRONMENTS: readonly MissionMode[] = ['SPACECRAFT']

export const BLACKOUT_NOTE = 'NASA cites communication blackouts of up to 2–3 weeks around solar conjunction.'

/** O ambiente pode ter apagão (tem fonte)? */
export function blackoutPossible(environment: MissionMode): boolean {
  return BLACKOUT_ENVIRONMENTS.includes(environment)
}

/** O apagão está valendo agora? Precisa do interruptor ligado E de um ambiente com apagão. */
export function isBlackoutActive(environment: MissionMode, commBlackout: boolean): boolean {
  return commBlackout && blackoutPossible(environment)
}
