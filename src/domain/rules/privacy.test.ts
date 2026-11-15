import { describe, expect, it } from 'vitest'
import {
  accessLevel,
  canView,
  visibleAuditEntries,
  type DataCategory,
  type PrivacyContext,
} from '@/domain/rules/privacy'
import type { AuditEntry, Role } from '@/domain/types'

const ctx = (role: Role, consent = false, breakGlass = false): PrivacyContext => ({
  role,
  consentShareWellbeingAlerts: consent,
  breakGlassActive: breakGlass,
})

const ALL: DataCategory[] = [
  'vitals',
  'radiation',
  'exerciseAdherence',
  'wellbeingDetail',
  'wellbeingAlert',
  'auditLog',
]

describe('R-PRIV-01 · matriz §6.7', () => {
  it('astronauta e flight surgeon veem tudo', () => {
    for (const role of ['ASTRONAUT', 'FLIGHT_SURGEON'] as const)
      for (const c of ALL) expect(accessLevel(c, ctx(role))).toBe('full')
  })

  it('CMO vê vitais, radiação e adesão ao exercício', () => {
    for (const c of ['vitals', 'radiation', 'exerciseAdherence'] as const)
      expect(accessLevel(c, ctx('CMO'))).toBe('full')
  })

  it('CMO sem consentimento nem break-glass não vê bem-estar', () => {
    expect(canView('wellbeingDetail', ctx('CMO'))).toBe(false)
    expect(canView('wellbeingAlert', ctx('CMO'))).toBe(false)
  })

  it('consentimento libera só o NÍVEL do alerta, nunca o detalhe (MH-04)', () => {
    expect(accessLevel('wellbeingAlert', ctx('CMO', true))).toBe('alertLevelOnly')
    expect(accessLevel('wellbeingDetail', ctx('CMO', true))).toBe('denied')
  })

  it('break-glass libera o detalhe (PRIV-03)', () => {
    expect(accessLevel('wellbeingDetail', ctx('CMO', false, true))).toBe('full')
    expect(accessLevel('wellbeingAlert', ctx('CMO', false, true))).toBe('full')
  })

  it('CMO vê só as próprias entradas do log de auditoria', () => {
    const log: AuditEntry[] = [
      { at: 't1', actor: 'ASTRONAUT', action: 'CONSENT_CHANGED', target: 'wellbeing' },
      { at: 't2', actor: 'CMO', action: 'BREAK_GLASS_VIEW', target: 'wellbeing', reason: 'test' },
    ]
    expect(accessLevel('auditLog', ctx('CMO'))).toBe('ownEntriesOnly')
    expect(visibleAuditEntries(log, ctx('CMO')).map((e) => e.at)).toEqual(['t2'])
    expect(visibleAuditEntries(log, ctx('ASTRONAUT'))).toHaveLength(2)
  })
})
