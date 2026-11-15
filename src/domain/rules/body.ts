// R-BODY-01 (SPEC §7, §6.1.1): indicadores da zona + perfil + consentimento + break-glass → status da zona.
// - A zona recebe o PIOR status entre os indicadores dela (BODY-02).
// - Zona com dado de bem-estar (Head) fica `restricted` para o CMO sem consentimento nem break-glass (BODY-06).
// - "Adapting" (R-PHASE-01) é P1 e fica fora daqui (task L5).
// Função PURA (sem React, sem store).
import { BODY_ZONES } from '@/domain/config/bodyZones'
import type { AlertLevel, BodyIndicator, BodyZone, BodyZoneId, ZoneStatus } from '@/domain/types'
import { canView, type PrivacyContext } from '@/domain/rules/privacy'
import { ALERT_LEVEL_ORDER } from '@/domain/rules/vitals'

/** Indicadores de bem-estar: dado RESTRITO (matriz §6.7). */
export const WELLBEING_INDICATORS: readonly BodyIndicator[] = ['mood', 'sleep']

export const isWellbeingIndicator = (i: BodyIndicator): boolean => WELLBEING_INDICATORS.includes(i)

/** Pior nível de uma lista (lista vazia → null). */
export function worstLevel(levels: readonly AlertLevel[]): AlertLevel | null {
  if (levels.length === 0) return null
  return levels.reduce((worst, l) => (ALERT_LEVEL_ORDER.indexOf(l) > ALERT_LEVEL_ORDER.indexOf(worst) ? l : worst))
}

/** Nível atual de cada indicador (vindo de R-VIT-02, R-EX-01, R-MH-01…). Indicador sem regra/dado fica ausente. */
export type IndicatorLevels = Partial<Record<BodyIndicator, AlertLevel>>

/**
 * R-BODY-01: status de UMA zona.
 * null = nenhum indicador da zona tem nível (a tela mostra "No data", nunca "Normal").
 */
export function zoneStatus(zone: BodyZone, levels: IndicatorLevels, privacy: PrivacyContext): ZoneStatus | null {
  const hasWellbeing = zone.indicators.some(isWellbeingIndicator)
  // A cor sozinha já revelaria o estado de saúde mental → cinza com cadeado (BODY-06).
  if (hasWellbeing && !canView('wellbeingAlert', privacy)) return 'restricted'
  const known = zone.indicators.map((i) => levels[i]).filter((l): l is AlertLevel => l !== undefined)
  return worstLevel(known)
}

/** R-BODY-01 para todas as zonas (padrão: BODY_ZONES do config). */
export function bodyStatus(
  levels: IndicatorLevels,
  privacy: PrivacyContext,
  zones: readonly BodyZone[] = BODY_ZONES,
): Record<BodyZoneId, ZoneStatus | null> {
  const out = {} as Record<BodyZoneId, ZoneStatus | null>
  for (const zone of zones) out[zone.id] = zoneStatus(zone, levels, privacy)
  return out
}
