import { describe, expect, it } from 'vitest'
import { bodyStatus, worstLevel, zoneStatus } from '@/domain/rules/body'
import type { PrivacyContext } from '@/domain/rules/privacy'
import { BODY_ZONES } from '@/domain/config/bodyZones'
import type { BodyZone, Role } from '@/domain/types'

const zone = (id: BodyZone['id']) => BODY_ZONES.find((z) => z.id === id)!
const ctx = (role: Role, consent = false, breakGlass = false): PrivacyContext => ({
  role,
  consentShareWellbeingAlerts: consent,
  breakGlassActive: breakGlass,
})

describe('R-BODY-01 · pior status da zona (BODY-02)', () => {
  it('pior nível de uma lista', () => {
    expect(worstLevel(['normal', 'attention', 'normal'])).toBe('attention')
    expect(worstLevel(['attention', 'urgent', 'normal'])).toBe('urgent')
    expect(worstLevel([])).toBeNull()
  })

  it('Heart = pior entre FC e pressão', () => {
    const s = zoneStatus(
      zone('heart'),
      { heartRate: 'attention', systolicBP: 'normal', diastolicBP: 'urgent' },
      ctx('ASTRONAUT'),
    )
    expect(s).toBe('urgent')
  })

  it('zona sem nenhum nível → null (sem dado, não "normal")', () => {
    expect(zoneStatus(zone('torso'), {}, ctx('ASTRONAUT'))).toBeNull()
  })
})

describe('R-BODY-01 · privacidade da Head (BODY-06)', () => {
  const levels = { mood: 'attention', sleep: 'normal' } as const

  it('CMO sem consentimento nem break-glass → restricted', () => {
    expect(zoneStatus(zone('head'), levels, ctx('CMO'))).toBe('restricted')
  })

  it('restricted mesmo sem nível calculado (não revela nada)', () => {
    expect(zoneStatus(zone('head'), {}, ctx('CMO'))).toBe('restricted')
  })

  it('CMO com consentimento ou break-glass vê o nível', () => {
    expect(zoneStatus(zone('head'), levels, ctx('CMO', true))).toBe('attention')
    expect(zoneStatus(zone('head'), levels, ctx('CMO', false, true))).toBe('attention')
  })

  it('astronauta e flight surgeon sempre veem', () => {
    expect(zoneStatus(zone('head'), levels, ctx('ASTRONAUT'))).toBe('attention')
    expect(zoneStatus(zone('head'), levels, ctx('FLIGHT_SURGEON'))).toBe('attention')
  })

  it('o CMO continua vendo as outras zonas', () => {
    const all = bodyStatus({ heartRate: 'attention', mood: 'urgent' }, ctx('CMO'))
    expect(all.head).toBe('restricted')
    expect(all.heart).toBe('attention')
  })
})
