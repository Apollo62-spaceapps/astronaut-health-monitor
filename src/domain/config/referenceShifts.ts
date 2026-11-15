// "Conversão" do normal pessoal entre ambientes (L7, Orbit §5B). NÃO inventar fisiologia: quanto FC, PA ou
// temperatura "deveriam" mudar em microgravidade ou gravidade parcial não tem fonte no catálogo (P-07, P-17).
// Entrada sem fonte = undefined e a UI diz NO_SOURCED_SHIFT (ENV-04: ambiente sem fonte não mostra número).
import type { MissionMode, Provenance, SourceId, VitalKind } from '@/domain/types'

export interface ReferenceShift {
  /** % esperado de mudança da referência ao entrar no ambiente. Só com fonte. */
  expectedShiftPct: number
  sourceIds: SourceId[]
  provenance: Provenance
}

export const NO_SOURCED_SHIFT = 'No sourced shift for this environment — using your personal reference only.'

/** Tabela ambiente × indicador. Vazia de propósito: nenhuma mudança tem fonte hoje. */
export const REFERENCE_SHIFTS: Record<MissionMode, Partial<Record<VitalKind, ReferenceShift>>> = {
  EARTH: {},
  ISS: {},
  LUNAR: {},
  SPACECRAFT: {},
}

export function referenceShift(mode: MissionMode, kind: VitalKind): ReferenceShift | undefined {
  return REFERENCE_SHIFTS[mode][kind]
}
