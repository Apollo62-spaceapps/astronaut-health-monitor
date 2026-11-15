import { describe, expect, it } from 'vitest'
import { ADAPTATION_WINDOW_DAYS, applyPhase, gravityChanged, inAdaptation } from '@/domain/rules/phase'
import { adherenceLevel } from '@/domain/rules/exercise'

const gravityZone = { hazard: 'gravity' as const }
const otherZone = { hazard: 'isolation' as const }
const change = '2026-11-14T08:00:00Z'
const later = (h: number) => new Date(Date.parse(change) + h * 3600_000).toISOString()

describe('R-PHASE-01 · Adapting', () => {
  it('troca de gravidade entre ambientes', () => {
    expect(gravityChanged('SPACECRAFT', 'LUNAR')).toBe(true)
    expect(gravityChanged('SPACECRAFT', 'EARTH')).toBe(true)
    expect(gravityChanged('SPACECRAFT', 'ISS')).toBe(false) // as duas em microgravidade
  })

  it('janela de 3 dias [S04]', () => {
    expect(ADAPTATION_WINDOW_DAYS).toBe(3)
    expect(inAdaptation(change, later(1))).toBe(true)
    expect(inAdaptation(change, later(72))).toBe(false)
    expect(inAdaptation(null, later(1))).toBe(false)
  })

  it('só substitui attention, em zona de gravidade', () => {
    expect(applyPhase('attention', gravityZone, change, later(1))).toBe('adapting')
    expect(applyPhase('attention', otherZone, change, later(1))).toBe('attention')
    expect(applyPhase('normal', gravityZone, change, later(1))).toBe('normal')
    expect(applyPhase('attention', gravityZone, change, later(80))).toBe('attention')
  })

  it('urgent nunca é mascarado', () => {
    expect(applyPhase('urgent', gravityZone, change, later(1))).toBe('urgent')
  })
})

describe('adesão → zona Legs (P1)', () => {
  it('abaixo do limiar ilustrativo → attention; nunca urgent', () => {
    expect(adherenceLevel(86, 70)).toBe('normal')
    expect(adherenceLevel(40, 70)).toBe('attention')
    expect(adherenceLevel(0, 70)).toBe('attention')
    expect(adherenceLevel(null, 70)).toBeNull()
  })
})
