import { describe, expect, it } from 'vitest'
import { applyShelter, streakDays, weeklyAdherence } from '@/domain/rules/exercise'
import { demoScenario } from '@/data/scenario'
import type { ExerciseSession } from '@/domain/types'

const s = (
  date: string,
  prescribedMin: number,
  doneMin: number,
  status: ExerciseSession['status'],
): ExerciseSession => ({
  date,
  device: 'CEVIS',
  prescribedMin,
  doneMin,
  status,
  selfReported: true,
})

describe('R-EX-01 · adesão semanal', () => {
  it('minutos feitos ÷ prescritos nos últimos 7 dias', () => {
    const sessions = [
      s('2026-11-01', 60, 60, 'done'),
      s('2026-11-10', 60, 30, 'partial'),
      s('2026-11-14', 60, 60, 'done'),
    ]
    expect(weeklyAdherence(sessions, '2026-11-14')).toMatchObject({ doneMin: 90, prescribedMin: 120, pct: 75 })
  })

  it('postponed fica fora da conta; feito acima do prescrito não passa de 100%', () => {
    const sessions = [s('2026-11-13', 60, 90, 'done'), s('2026-11-14', 60, 0, 'postponed')]
    expect(weeklyAdherence(sessions, '2026-11-14').pct).toBe(100)
  })

  it('sem prescrição → null', () => {
    expect(weeklyAdherence([], '2026-11-14').pct).toBeNull()
  })

  it('cenário da demo (dia 120): 86% e sequência de 6 dias', () => {
    const ex = demoScenario().exercise
    expect(Math.round(weeklyAdherence(ex, '2026-11-14').pct!)).toBe(86)
    expect(streakDays(ex, '2026-11-14')).toBe(6)
  })
})

describe('R-EX-02 · abrigo ativo → postponed', () => {
  const day = [s('2026-11-14', 45, 45, 'done'), s('2026-11-14', 40, 0, 'skipped'), s('2026-11-13', 35, 0, 'skipped')]

  it('todas as sessões de hoje viram postponed com o motivo; adiada nunca fica "done" (precedência do abrigo)', () => {
    const out = applyShelter(day, '2026-11-14T08:00:00Z', true)
    expect(out[0]).toMatchObject({ status: 'postponed', doneMin: 0, reason: 'shelter active' })
    expect(out[1]).toMatchObject({ status: 'postponed', reason: 'shelter active' })
    expect(out[2]!.status).toBe('skipped') // outro dia não muda
  })

  it('dia adiado pelo abrigo não quebra a sequência (EX-04)', () => {
    const sessions = [s('2026-11-13', 45, 45, 'done'), s('2026-11-14', 45, 45, 'done')]
    expect(streakDays(applyShelter(sessions, '2026-11-14T08:00:00Z', true), '2026-11-14')).toBe(1)
  })

  it('sem abrigo nada muda', () => {
    expect(applyShelter(day, '2026-11-14T08:00:00Z', false)).toEqual(day)
  })
})
