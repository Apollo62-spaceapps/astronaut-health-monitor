import { describe, expect, it } from 'vitest'
import {
  buildBaseline,
  deviationPct,
  evaluateVital,
  formatDeviation,
  vitalAlert,
  vitalLevel,
  VITAL_SAFE_ACTIONS,
} from '@/domain/rules/vitals'
import { demoScenario } from '@/data/scenario'
import { missionDayToIso, DEMO_MISSION_DAY } from '@/state/store'
import type { Baseline, VitalKind, VitalReading } from '@/domain/types'

const reading = (kind: VitalKind, value: number, takenAt: string): VitalReading => ({
  kind,
  value,
  unit: 'bpm',
  takenAt,
  provenance: { kind: 'simulated' },
})

const baseline = (preflightMean: number, inflightMean = preflightMean): Baseline => ({
  kind: 'heartRate',
  preflightMean,
  inflightMean,
  windowDays: 14,
})

// Limiares FIXOS só para o teste: checamos a LÓGICA, não os valores de P-01.
const T = {
  heartRate: { attention: 10, urgent: 20 },
  systolicBP: { attention: 10, urgent: 20 },
  diastolicBP: { attention: 10, urgent: 20 },
  glucose: { attention: 10, urgent: 20 },
  bodyTemp: { attention: 10, urgent: 20 },
}

describe('R-VIT-01 · desvio %', () => {
  it('calcula o desvio em relação ao baseline pré-voo', () => {
    expect(deviationPct(110, baseline(100))).toBeCloseTo(10)
    expect(deviationPct(90, baseline(100))).toBeCloseTo(-10)
    expect(deviationPct(100, baseline(100))).toBe(0)
  })

  it('pode usar o baseline em voo', () => {
    expect(deviationPct(110, baseline(100, 110), 'inflight')).toBe(0)
  })

  it('devolve null com baseline 0 ou inválido', () => {
    expect(deviationPct(80, baseline(0))).toBeNull()
    expect(deviationPct(80, baseline(NaN))).toBeNull()
  })
})

describe('R-VIT-02 · desvio → nível', () => {
  it('abaixo do limiar de atenção → normal', () => {
    expect(vitalLevel('heartRate', 9.9, T)).toBe('normal')
  })

  it('limiar é inclusivo (>=)', () => {
    expect(vitalLevel('heartRate', 10, T)).toBe('attention')
    expect(vitalLevel('heartRate', 20, T)).toBe('urgent')
  })

  it('desvio negativo conta pelo valor absoluto', () => {
    expect(vitalLevel('heartRate', -15, T)).toBe('attention')
    expect(vitalLevel('heartRate', -25, T)).toBe('urgent')
  })

  it('usa os placeholders de config/thresholds.ts por padrão', () => {
    expect(['normal', 'attention', 'urgent']).toContain(vitalLevel('heartRate', 18))
  })
})

describe('baseline', () => {
  const pre = [reading('heartRate', 70, '2026-07-01T07:00:00Z'), reading('heartRate', 72, '2026-07-02T07:00:00Z')]
  const inflight = [
    reading('heartRate', 60, '2026-08-01T07:00:00Z'), // fora da janela
    reading('heartRate', 80, '2026-08-20T07:00:00Z'),
    reading('heartRate', 90, '2026-08-25T07:00:00Z'),
    reading('heartRate', 200, '2026-08-27T07:00:00Z'), // futuro em relação a "agora"
  ]

  it('pré-voo = média do exame; em voo = média da janela até agora', () => {
    const b = buildBaseline('heartRate', pre, inflight, '2026-08-26T00:00:00Z', 14)
    expect(b?.preflightMean).toBe(71)
    expect(b?.inflightMean).toBe(85)
  })

  it('sem leitura pré-voo → null', () => {
    expect(buildBaseline('heartRate', [], inflight, '2026-08-26T00:00:00Z')).toBeNull()
  })

  it('sem leitura em voo na janela → média em voo = pré-voo', () => {
    expect(buildBaseline('heartRate', pre, [], '2026-08-26T00:00:00Z')?.inflightMean).toBe(71)
  })
})

describe('evaluateVital + alerta', () => {
  it('sem dado → null (nunca "normal" por falta de dado)', () => {
    expect(evaluateVital('glucose', [], [], '2026-08-26T00:00:00Z')).toBeNull()
  })

  it('ignora leitura no futuro em relação ao relógio simulado', () => {
    const pre = [reading('heartRate', 100, '2026-07-01T07:00:00Z')]
    const inflight = [
      reading('heartRate', 100, '2026-08-20T07:00:00Z'),
      reading('heartRate', 300, '2026-09-01T07:00:00Z'),
    ]
    expect(evaluateVital('heartRate', inflight, pre, '2026-08-26T00:00:00Z')?.deviationPct).toBe(0)
  })

  it('alerta só para não normal, com ruleId e só ações não clínicas (CORE-09)', () => {
    const pre = [reading('heartRate', 100, '2026-07-01T07:00:00Z')]
    const ok = evaluateVital(
      'heartRate',
      [reading('heartRate', 101, '2026-08-20T07:00:00Z')],
      pre,
      '2026-08-26T00:00:00Z',
    )!
    expect(vitalAlert(ok, '2026-08-26T00:00:00Z')).toBeNull()

    const high = evaluateVital(
      'heartRate',
      [reading('heartRate', 150, '2026-08-20T07:00:00Z')],
      pre,
      '2026-08-26T00:00:00Z',
    )!
    const alert = vitalAlert(high, '2026-08-26T00:00:00Z')!
    expect(alert.ruleId).toBe('R-VIT-02')
    expect(alert.level).toBe(high.level)
    expect(alert.safeActions).toEqual([...VITAL_SAFE_ACTIONS])
    expect(`${alert.title} ${alert.message}`).not.toMatch(/\b(fit|healthy|diagnos)/i)
  })

  it('formata o desvio para a UI', () => {
    expect(formatDeviation(17.98)).toBe('+18%')
    expect(formatDeviation(-4.26)).toBe('-4.3%')
  })
})

describe('cenário da demo (dia 120)', () => {
  it('FC de repouso: 84 bpm, +18% sobre o pré-voo de ~71,2', () => {
    const s = demoScenario()
    const ev = evaluateVital('heartRate', s.vitals, s.preflight, missionDayToIso(DEMO_MISSION_DAY, 23))!
    expect(ev.latest.value).toBe(84)
    expect(ev.baseline.preflightMean).toBeCloseTo(71.2, 1)
    expect(formatDeviation(ev.deviationPct)).toBe('+18%')
  })
})
