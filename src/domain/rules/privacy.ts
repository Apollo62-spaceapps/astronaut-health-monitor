// R-PRIV-01 (SPEC §7): perfil + consentimento + break-glass → pode ver o dado?
// Segue a matriz de acesso da SPEC §6.7. Função PURA (sem React, sem store).
import type { AuditEntry, Role } from '@/domain/types'

/** Categorias de dado da matriz §6.7. */
export type DataCategory =
  | 'vitals' // vitais, baseline, gráficos
  | 'radiation' // dose e eventos de radiação
  | 'exerciseAdherence'
  | 'wellbeingDetail' // humor, sono, notas (RESTRITO)
  | 'wellbeingAlert' // só o nível do alerta de bem-estar, sem detalhes
  | 'auditLog'

/**
 * Nível de acesso:
 * - full: vê tudo da categoria;
 * - alertLevelOnly: só o nível do alerta, sem detalhes (consentimento, MH-04);
 * - ownEntriesOnly: só as próprias entradas (log de auditoria do CMO);
 * - denied: não vê.
 */
export type AccessLevel = 'full' | 'alertLevelOnly' | 'ownEntriesOnly' | 'denied'

export interface PrivacyContext {
  role: Role
  /** Consentimento do astronauta para compartilhar o NÍVEL do alerta de bem-estar com o CMO. */
  consentShareWellbeingAlerts: boolean
  /** Break-glass ativo (motivo + auditoria são exigidos pelo store, PRIV-03). */
  breakGlassActive: boolean
}

/** R-PRIV-01: nível de acesso de um perfil a uma categoria de dado. */
export function accessLevel(category: DataCategory, ctx: PrivacyContext): AccessLevel {
  // Astronauta (dono do dado) e Flight Surgeon veem tudo (matriz §6.7).
  if (ctx.role === 'ASTRONAUT' || ctx.role === 'FLIGHT_SURGEON') return 'full'

  // CMO
  switch (category) {
    case 'vitals':
    case 'radiation':
    case 'exerciseAdherence':
      return 'full'
    case 'auditLog':
      return 'ownEntriesOnly'
    case 'wellbeingDetail':
      // Só via break-glass (PRIV-03). Consentimento NÃO libera o detalhe.
      return ctx.breakGlassActive ? 'full' : 'denied'
    case 'wellbeingAlert':
      if (ctx.breakGlassActive) return 'full'
      return ctx.consentShareWellbeingAlerts ? 'alertLevelOnly' : 'denied'
  }
}

/** Atalho: o perfil vê algo da categoria? */
export function canView(category: DataCategory, ctx: PrivacyContext): boolean {
  return accessLevel(category, ctx) !== 'denied'
}

/** Entradas do log de auditoria que o perfil pode ver (CMO: só as próprias). */
export function visibleAuditEntries(log: readonly AuditEntry[], ctx: PrivacyContext): AuditEntry[] {
  const level = accessLevel('auditLog', ctx)
  if (level === 'full') return [...log]
  if (level === 'ownEntriesOnly') return log.filter((e) => e.actor === ctx.role)
  return []
}
