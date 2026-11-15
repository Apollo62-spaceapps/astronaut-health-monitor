import { describe, expect, it } from 'vitest'
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import { BODY_ZONES } from '@/domain/config/bodyZones'
import { INPUT_PLAUSIBILITY, THRESHOLDS_ARE_ILLUSTRATIVE, VITAL_DEVIATION_PCT } from '@/domain/config/thresholds'
import { MISSION_MODES, VITAL_KINDS } from '@/domain/types'

describe('ambientes (adendo §17)', () => {
  it('existem os 4 modos, com rótulo e token de faixa', () => {
    expect(Object.keys(ENVIRONMENTS).sort()).toEqual([...MISSION_MODES].sort())
    expect(ENVIRONMENTS.SPACECRAFT.label).toBe('Spacecraft')
    expect(ENVIRONMENTS.ISS.label).toBe('Space Station')
  })

  it('ETA do solo = 2 × atraso de ida (ESC-03)', () => {
    expect(groundReplySec('SPACECRAFT')).toBe(2400) // ~40 min
    expect(groundReplySec('EARTH')).toBe(0)
    expect(groundReplySec('LUNAR')).toBeCloseTo(2.6)
  })

  it('só a Spacecraft tem taxa de dose com fonte (ENV-04, P-16)', () => {
    expect(ENVIRONMENTS.SPACECRAFT.doseRateMSvPerDay).toBe(1.8)
    expect(ENVIRONMENTS.SPACECRAFT.doseRateProvenance?.kind).toBe('real')
    for (const m of ['EARTH', 'ISS', 'LUNAR'] as const) expect(ENVIRONMENTS[m].doseRateMSvPerDay).toBeNull()
  })

  it('equipamentos de exercício só na ISS [S13] (P-18)', () => {
    expect(ENVIRONMENTS.ISS.exerciseDevices).toEqual(['ARED', 'T2', 'CEVIS'])
    expect(ENVIRONMENTS.SPACECRAFT.exerciseDevices).toBeNull()
  })
})

describe('limiares (P-01)', () => {
  it('são marcados como ilustrativos e cobrem todos os vitais', () => {
    expect(THRESHOLDS_ARE_ILLUSTRATIVE).toBe(true)
    for (const k of VITAL_KINDS) {
      expect(VITAL_DEVIATION_PCT[k].urgent).toBeGreaterThan(VITAL_DEVIATION_PCT[k].attention)
      expect(INPUT_PLAUSIBILITY[k].max).toBeGreaterThan(INPUT_PLAUSIBILITY[k].min)
    }
  })
})

describe('zonas do corpo (§6.1.1)', () => {
  it('cabeça = isolamento, coração = gravidade, torso pendente (P-13), pele = inferência', () => {
    const z = Object.fromEntries(BODY_ZONES.map((b) => [b.id, b]))
    expect(z.head?.hazard).toBe('isolation')
    expect(z.heart?.hazard).toBe('gravity')
    expect(z.torso?.hazard).toBeNull()
    expect(z.torso?.hazardBasis).toBe('pending')
    expect(z.skin?.hazardBasis).toBe('inference')
  })
})
