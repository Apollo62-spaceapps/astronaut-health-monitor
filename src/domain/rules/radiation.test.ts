import { describe, expect, it } from 'vitest'
import {
  CAREER_LIMIT_MSV,
  careerDose,
  careerDosePct,
  missionDose,
  SHELTER_LABEL,
  SHELTER_STEPS,
  shelterAlert,
} from '@/domain/rules/radiation'
import { DEMO_SPACE_WEATHER_EVENT } from '@/data/scenario'
import type { RadiationState } from '@/domain/types'

const rad = (prior: number): RadiationState => ({ careerPriorMSv: prior, missionDayRateMSv: 1.8, careerLimitMSv: 600 })

describe('R-RAD-02 · dose da missão pelo ambiente', () => {
  it('Spacecraft, dia 120 → 216 mSv (1,8 mSv/dia [S08, S09])', () => {
    expect(missionDose(120, 'SPACECRAFT').missionMSv).toBeCloseTo(216)
    expect(missionDose(120, 'SPACECRAFT').provenance?.kind).toBe('simulated')
  })

  it('ambiente sem taxa com fonte não soma dose (ENV-04, P-16)', () => {
    for (const m of ['EARTH', 'ISS', 'LUNAR'] as const) {
      expect(missionDose(120, m)).toMatchObject({ missionMSv: null, rateMSvPerDay: null })
    }
  })
})

describe('R-RAD-01 · % do limite de carreira', () => {
  it('600 mSv é o limite [S03]', () => {
    expect(CAREER_LIMIT_MSV).toBe(600)
    expect(careerDosePct(216)).toBeCloseTo(36)
    expect(careerDosePct(600)).toBe(100)
  })

  it('soma a dose prévia', () => {
    expect(careerDose(rad(84), 120, 'SPACECRAFT')).toMatchObject({ totalMSv: 300, pctOfLimit: 50 })
  })

  it('sem taxa → total e % ficam null (não inventa número)', () => {
    expect(careerDose(rad(84), 120, 'ISS')).toMatchObject({ priorMSv: 84, totalMSv: null, pctOfLimit: null })
  })
})

describe('R-RAD-03 · evento SEP ativo → abrigo', () => {
  it('sem evento ativo → sem alerta', () => {
    expect(shelterAlert(DEMO_SPACE_WEATHER_EVENT, false, 't')).toBeNull()
    expect(shelterAlert(null, true, 't')).toBeNull()
  })

  it('evento ativo → urgent com os 3 passos da Orion [S05]', () => {
    const a = shelterAlert(DEMO_SPACE_WEATHER_EVENT, true, '2026-11-14T08:00:00Z')!
    expect(a.level).toBe('urgent')
    expect(a.ruleId).toBe('R-RAD-03')
    expect(a.safeActions).toEqual([...SHELTER_STEPS])
    expect(a.safeActions).toHaveLength(3)
    expect(a.message).toContain(SHELTER_LABEL)
    expect(a.message).toContain('Real event observed near Earth (NASA DONKI)')
    expect(a.message).not.toMatch(/\bS[1-5]\b/) // RAD-07
  })
})
