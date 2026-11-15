// R-PROJ-01 / R-PROJ-02: projeção como aviso antecipado (attention), nunca urgent nem diagnóstico.
import { describe, expect, it } from 'vitest'
import { linearFit, projectDose, projectVital, projectionAlert } from '@/domain/rules/projection'
import type { VitalEvaluation } from '@/domain/rules/vitals'
import type { CareerDose } from '@/domain/rules/radiation'
import type { VitalReading } from '@/domain/types'

const NOW = '2026-11-15T12:00:00Z'
const day = (offset: number) => new Date(Date.parse(NOW) - offset * 86_400_000).toISOString()
const hr = (values: number[]): VitalReading[] =>
  values.map((v, i) => ({
    kind: 'heartRate',
    value: v,
    unit: 'bpm',
    takenAt: day(values.length - 1 - i),
    provenance: { kind: 'simulated' },
  }))
const ev = (latest: number, level: VitalEvaluation['level'], preflightMean = 70): VitalEvaluation => ({
  kind: 'heartRate',
  latest: { kind: 'heartRate', value: latest, unit: 'bpm', takenAt: NOW, provenance: { kind: 'simulated' } },
  baseline: { kind: 'heartRate', preflightMean, inflightMean: preflightMean, windowDays: 14 },
  deviationPct: ((latest - preflightMean) / preflightMean) * 100,
  level,
  ruleIds: ['R-VIT-01', 'R-VIT-02'],
  illustrativeThresholds: true,
})

describe('linearFit', () => {
  it('reta perfeita: inclinação certa e R² = 1', () => {
    const f = linearFit([0, 1, 2, 3], [10, 12, 14, 16])
    expect(f.slope).toBeCloseTo(2)
    expect(f.r2).toBeCloseTo(1)
  })
})

describe('R-PROJ-01 projectVital', () => {
  it('subida constante ainda Normal → avisa quando cruza Attention (+10% de 70 = 77) dentro do horizonte', () => {
    // 70,71,…,75: +1 bpm/dia; linha 77 → ~2 dias
    const p = projectVital(ev(75, 'normal'), hr([70, 71, 72, 73, 74, 75]), NOW)
    expect(p).toMatchObject({ toward: 'attention', daysToLine: 2, level: 'attention', ruleId: 'R-PROJ-01' })
  })

  it('já em Attention → projeta para Urgent (+25% = 87,5), mas o aviso continua attention', () => {
    const p = projectVital(ev(84, 'attention'), hr([79, 80, 81, 82, 83, 84]), NOW)
    expect(p).toMatchObject({ toward: 'urgent', daysToLine: 4, level: 'attention' })
  })

  it('não projeta: urgent, poucos dias, ruído, voltando ao pré-voo ou linha além do horizonte', () => {
    expect(projectVital(ev(90, 'urgent'), hr([86, 87, 88, 89, 90]), NOW)).toBeNull()
    expect(projectVital(ev(74, 'normal'), hr([72, 73, 74]), NOW)).toBeNull()
    expect(projectVital(ev(72, 'normal'), hr([72, 69, 73, 68, 72, 70]), NOW)).toBeNull()
    expect(projectVital(ev(80, 'attention'), hr([85, 84, 83, 82, 81, 80]), NOW)).toBeNull()
    expect(projectVital(ev(71, 'normal'), hr([70, 70.2, 70.4, 70.6, 70.8, 71]), NOW)).toBeNull()
  })

  it('alerta: só ações não clínicas, sem diagnóstico, com "projection" no texto', () => {
    const p = projectVital(ev(75, 'normal'), hr([70, 71, 72, 73, 74, 75]), NOW)!
    const a = projectionAlert(p, NOW)
    expect(a.level).toBe('attention')
    expect(a.title).toBe('Resting heart rate heading toward Attention in ~2 days')
    expect(a.message).toMatch(/projection from your own readings, not a medical assessment/)
    expect(a.safeActions).toEqual(['Re-measure daily', 'Notify CMO if it continues'])
    expect(`${a.title} ${a.message}`).not.toMatch(/\b(fit|unfit|healthy|diagnos\w*|prescri\w*|medication)\b/i)
  })
})

describe('R-PROJ-02 projectDose', () => {
  const dose = (total: number | null, rate: number | null): CareerDose => ({
    priorMSv: 0,
    missionMSv: total,
    totalMSv: total,
    pctOfLimit: total === null ? null : (total / 600) * 100,
    limitMSv: 600,
    rateMSvPerDay: rate,
    provenance: null,
    ruleIds: ['R-RAD-01', 'R-RAD-02'],
  })

  it('216 mSv a 1,8 mSv/dia: 75% (450 mSv) em 130 dias, 100% em 214 dias, 45% em 30 dias', () => {
    expect(projectDose(dose(216, 1.8))).toMatchObject({ daysToAttention: 130, daysToLimit: 214, ruleId: 'R-PROJ-02' })
    expect(projectDose(dose(216, 1.8))!.pctIn30Days).toBeCloseTo(45)
  })

  it('sem taxa com fonte (ENV-04) → null, não inventa número', () => {
    expect(projectDose(dose(null, null))).toBeNull()
    expect(projectDose(dose(216, null))).toBeNull()
  })
})
