// Exibição de R-PHASE-01 nas telas: quando a zona do vital está "Adapting" (troca de gravidade),
// o indicador que estava em Attention é MOSTRADO como Adapting, com o desvio medido explicado.
// Não decide nada: só lê o status da zona que o motor de regras já calculou. Urgent nunca muda.
import type { AlertLevel, BodyZoneId, VitalKind, ZoneStatus } from '@/domain/types'
import { BODY_ZONES } from '@/domain/config/bodyZones'

export function zoneOfVital(kind: VitalKind): BodyZoneId | null {
  return BODY_ZONES.find((z) => (z.indicators as string[]).includes(kind))?.id ?? null
}

/** Nível exibido para um vital: Attention vira Adapting se a zona dele está em Adapting. */
export function shownLevel(
  kind: VitalKind,
  level: AlertLevel,
  body: Record<BodyZoneId, ZoneStatus | null>,
): ZoneStatus {
  const zone = zoneOfVital(kind)
  return zone && level === 'attention' && body[zone] === 'adapting' ? 'adapting' : level
}
