// Zonas do mapa do corpo (SPEC §6.1.1). O mapeamento zona → hazard é proposta do time,
// conferida na página "The Human Body in Space" (S19), exceto onde marcado.
import type { BodyZone, Hazard, SourceId } from '@/domain/types'

export const BODY_ZONES: readonly BodyZone[] = [
  {
    id: 'head',
    label: 'Head',
    functionText: 'Brain: sleep, mood and attention.',
    indicators: ['sleep', 'mood'], // mood é RESTRITO (privacidade, BODY-06)
    hazard: 'isolation',
    hazardBasis: 'fact', // [S19] sono, ritmo circadiano e saúde comportamental ↔ isolamento
    sourceIds: ['S19'],
    priority: 'P0',
  },
  {
    id: 'heart',
    label: 'Heart',
    functionText: 'Pumps blood and keeps blood pressure stable when you stand up.',
    indicators: ['heartRate', 'systolicBP', 'diastolicBP'],
    hazard: 'gravity',
    hazardBasis: 'fact', // [S19] declínio cardíaco em voo e intolerância ortostática
    sourceIds: ['S19'],
    priority: 'P0',
  },
  {
    id: 'torso',
    label: 'Torso',
    functionText: 'Metabolism: turns food into energy.',
    indicators: ['glucose'],
    hazard: null, // P-13: card mostra "Related hazard: under review"
    hazardBasis: 'pending',
    sourceIds: [],
    priority: 'P0',
  },
  {
    id: 'skin',
    label: 'Skin / body',
    functionText: 'Body temperature regulation.',
    indicators: ['bodyTemp'],
    hazard: 'hostileEnvironment',
    hazardBasis: 'inference', // [INFERÊNCIA do time] temperatura como sinal de possível infecção
    sourceIds: ['S19'],
    priority: 'P0',
  },
  {
    id: 'legs',
    label: 'Legs',
    functionText: 'Muscles and bones that carry you in gravity.',
    indicators: ['exerciseAdherence'],
    hazard: 'gravity',
    hazardBasis: 'fact', // [S19] perda de massa óssea e muscular em microgravidade
    sourceIds: ['S19'],
    priority: 'P1',
  },
]

/** Radiação é overlay do corpo inteiro, não zona [S19, S03]. */
export const RADIATION_OVERLAY: { hazard: Hazard; sourceIds: SourceId[] } = {
  hazard: 'radiation',
  sourceIds: ['S19', 'S03'],
}

/** Rótulos da UI para os hazards do HRP (os 5 do briefing, S01). */
export const HAZARD_LABEL: Record<Hazard, string> = {
  radiation: 'Space radiation',
  isolation: 'Isolation & confinement',
  distance: 'Distance from Earth',
  gravity: 'Gravity fields',
  hostileEnvironment: 'Hostile / closed environments',
}
