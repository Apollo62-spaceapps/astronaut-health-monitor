import { describe, expect, it } from 'vitest'
import { ASTRONAUT, DEMO_SEP_ID, DEMO_SPACE_WEATHER_EVENT, demoScenario } from '@/data/scenario'
import { SOURCES } from '@/data/sources'

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

describe('cenário da demo (K3)', () => {
  const s = demoScenario()
  const day120 = (kind: string) => s.vitals.filter((r) => r.kind === kind).at(-1)?.value
  const pre = (kind: string) => mean(s.preflight.filter((r) => r.kind === kind).map((r) => r.value))

  it('tem 14 dias de pré-voo e 120 dias em voo para os 5 vitais', () => {
    expect(s.preflight).toHaveLength(5 * 14)
    expect(s.vitals).toHaveLength(5 * 120)
    expect(s.vitals.every((r) => r.provenance.kind === 'simulated')).toBe(true)
  })

  it('dia 120 reproduz a tela de referência do design system', () => {
    expect(day120('heartRate')).toBe(84)
    expect(((84 - pre('heartRate')) / pre('heartRate')) * 100).toBeCloseTo(18, 0) // ▲ Attention · +18%
    expect(day120('systolicBP')).toBe(121)
    expect(day120('diastolicBP')).toBe(79)
    // Career dose: (0 + 120 × 1,8) / 600 = 36%
    expect(((ASTRONAUT.careerPriorMSv + 120 * 1.8) / 600) * 100).toBeCloseTo(36)
  })

  it('adesão ao exercício dos últimos 7 dias ≈ 86%, com 6 dias seguidos completos', () => {
    const dates = [...new Set(s.exercise.map((e) => e.date))].sort().slice(-7)
    const week = s.exercise.filter((e) => dates.includes(e.date))
    const pct = (week.reduce((a, e) => a + e.doneMin, 0) / week.reduce((a, e) => a + e.prescribedMin, 0)) * 100
    expect(Math.round(pct)).toBe(86)
    const daily = dates.map((d) => s.exercise.filter((e) => e.date === d).every((e) => e.status === 'done'))
    expect(daily.slice(-6).every(Boolean)).toBe(true)
  })

  it('a rotina da Space Station inclui a manutenção da Spacecraft (§18)', () => {
    const maint = s.routine.find((r) => r.kind === 'maintenance')
    expect(maint?.environments).toEqual(['ISS'])
    for (const env of ['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT'] as const) {
      expect(s.routine.some((r) => r.kind === 'measure' && r.environments.includes(env))).toBe(true)
    }
  })

  it('o evento solar é o real do DONKI, com os campos da SPEC (RAD-03)', () => {
    expect(DEMO_SPACE_WEATHER_EVENT).toMatchObject({
      sepID: DEMO_SEP_ID,
      eventTime: '2024-05-11T02:10Z',
      instrument: 'GOES-P: SEISS >100 MeV',
      link: 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1',
      linkedEvents: ['2024-05-11T01:10:00-FLR-001', '2024-05-11T01:36:00-CME-001'],
    })
    expect(DEMO_SPACE_WEATHER_EVENT.provenance).toMatchObject({ kind: 'real', sourceId: 'S07' })
  })

  it('cada chamada devolve uma cópia nova (reset da demo não herda mudanças)', () => {
    const a = demoScenario()
    a.vitals.pop()
    expect(demoScenario().vitals).toHaveLength(5 * 120)
  })
})

describe('catálogo de fontes (SRC-01)', () => {
  it('tem S01…S19, sem repetição, todas com URL, uso e termos', () => {
    expect(SOURCES.map((x) => x.id)).toEqual(Array.from({ length: 19 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`))
    for (const src of SOURCES) {
      expect(src.urls.length).toBeGreaterThan(0)
      expect(src.urls.every((u) => u.startsWith('https://'))).toBe(true)
      expect(src.use.length).toBeGreaterThan(0)
      expect(src.terms.length).toBeGreaterThan(0)
    }
  })
})
