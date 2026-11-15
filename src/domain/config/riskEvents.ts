// Tipos de evento do Crew Risk Outlook (L7, Orbit §5A/§5C). Só riscos do HRP listados nas Standard Measures
// (S23: "HRP risks addressed"). O MAPA "quais drivers levam a qual evento" é proposta do time, não da NASA:
// mappingBasis = 'team-proposal' e a UI mostra "Mapping reviewed by: pending". Nunca mostrar probabilidade.
import type { Hazard, SourceId } from '@/domain/types'
import type { DriverId } from '@/domain/rules/risk'

export interface RiskEvent {
  id: string
  /** Texto da UI (inglês), como o risco aparece na fonte. */
  label: string
  hazard: Hazard
  /** Drivers que o time propõe ligar a este evento ([] = sem ligação proposta; só aparece como contexto). */
  drivers: DriverId[]
  sourceIds: SourceId[]
  mappingBasis: 'team-proposal'
}

const S: SourceId[] = ['S23']

export const RISK_EVENTS: readonly RiskEvent[] = [
  // Gravidade alterada
  {
    id: 'orthostatic',
    label: 'Orthostatic intolerance',
    hazard: 'gravity',
    drivers: ['restingHR', 'drift'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  {
    id: 'aerobic',
    label: 'Reduced aerobic capacity',
    hazard: 'gravity',
    drivers: ['exercise'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  {
    id: 'muscle',
    label: 'Loss of muscle mass and strength',
    hazard: 'gravity',
    drivers: ['exercise'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  {
    id: 'bone',
    label: 'Bone fracture',
    hazard: 'gravity',
    drivers: ['exercise'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  {
    id: 'sensorimotor',
    label: 'Sensorimotor changes',
    hazard: 'gravity',
    drivers: [],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  {
    id: 'vision',
    label: 'Vision changes',
    hazard: 'gravity',
    drivers: [],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  // Radiação
  {
    id: 'radiation',
    label: 'Space radiation exposure',
    hazard: 'radiation',
    drivers: ['dose', 'solarEvent'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  // Distância da Terra
  {
    id: 'medical-capability',
    label: 'Limited in-flight medical capability',
    hazard: 'distance',
    drivers: ['commDelay'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  // Isolamento e confinamento
  {
    id: 'behavioral',
    label: 'Cognitive or behavioral decrements',
    hazard: 'isolation',
    drivers: ['mood', 'sleep'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  // Ambiente fechado e hostil
  {
    id: 'sleep-workload',
    label: 'Sleep loss and work overload',
    hazard: 'hostileEnvironment',
    drivers: ['sleep'],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  {
    id: 'eva-injury',
    label: 'Injury during extravehicular activity',
    hazard: 'hostileEnvironment',
    drivers: [],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
  {
    id: 'immune',
    label: 'Altered immune response',
    hazard: 'hostileEnvironment',
    drivers: [],
    sourceIds: S,
    mappingBasis: 'team-proposal',
  },
]

/** Eventos do hazard ligados a algum driver ativo. [] → a UI diz "Related event: under review". */
export function relatedEvents(hazard: Hazard, activeDrivers: readonly DriverId[]): RiskEvent[] {
  return RISK_EVENTS.filter((e) => e.hazard === hazard && e.drivers.some((d) => activeDrivers.includes(d)))
}
