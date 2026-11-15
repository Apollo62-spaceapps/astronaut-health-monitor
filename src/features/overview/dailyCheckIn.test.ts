// Check-in diário (Overview): humor e sono obrigatórios, vitais opcionais, vírgula decimal e erros visíveis.
import { describe, expect, it } from 'vitest'
import { validateDailyCheckIn } from '@/features/overview/OverviewPage'

describe('validateDailyCheckIn', () => {
  it('atualizar só humor e sono funciona (vitais em branco são opcionais)', () => {
    const r = validateDailyCheckIn('4', '7', { heartRate: '', bodyTemp: '' })
    expect(r).toMatchObject({ ok: true, mood: 4, sleepHours: 7, vitals: [] })
  })

  it('aceita vírgula decimal do teclado em português', () => {
    const r = validateDailyCheckIn('3', '7,5', { bodyTemp: '36,6', heartRate: '72' })
    expect(r).toMatchObject({ ok: true, sleepHours: 7.5 })
    if (r.ok) expect(r.vitals).toEqual([['heartRate', 72, 'bpm'], ['bodyTemp', 36.6, '°C']])
  })

  it('erros por campo, nunca em silêncio: sono vazio e glicose fora da faixa de digitação', () => {
    const r = validateDailyCheckIn('3', '', { glucose: '5.5' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.sleepHours).toMatch(/hours you slept/)
      expect(r.errors.glucose).toMatch(/between 20 and 600 mg\/dL/)
    }
  })
})
