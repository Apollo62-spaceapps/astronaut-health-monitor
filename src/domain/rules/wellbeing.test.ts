import { describe, expect, it } from 'vitest'
import { evaluateWellbeing, wellbeingAlert } from '@/domain/rules/wellbeing'
import { demoScenario } from '@/data/scenario'
import type { WellbeingEntry } from '@/domain/types'

const T = { moodAtOrBelow: 2, forDays: 3, sleepBelowHours: 5 }
const day = (d: number, mood: WellbeingEntry['mood'], sleepHours: number): WellbeingEntry => ({
  date: `2026-11-${String(d).padStart(2, '0')}`,
  mood,
  sleepHours,
})

describe('R-MH-01 · bem-estar baixo', () => {
  it('humor baixo em TODOS os últimos N dias → mood attention', () => {
    const ev = evaluateWellbeing([day(10, 4, 7), day(11, 2, 7), day(12, 1, 7), day(13, 2, 7)], '2026-11-13', T)!
    expect(ev.mood).toBe('attention')
    expect(ev.sleep).toBe('normal')
  })

  it('um dia bom quebra a sequência', () => {
    expect(evaluateWellbeing([day(11, 2, 4), day(12, 4, 4), day(13, 2, 4)], '2026-11-13', T)!.mood).toBe('normal')
  })

  it('sono abaixo do limiar em todos os dias → sleep attention', () => {
    expect(evaluateWellbeing([day(11, 4, 4.5), day(12, 4, 4), day(13, 4, 3)], '2026-11-13', T)!.sleep).toBe('attention')
  })

  it('ignora registros do futuro e exige N registros', () => {
    expect(evaluateWellbeing([day(12, 1, 3), day(13, 1, 3)], '2026-11-13', T)).toBeNull()
    expect(evaluateWellbeing([day(11, 4, 7), day(12, 4, 7), day(13, 4, 7), day(14, 1, 1)], '2026-11-13', T)!.mood).toBe(
      'normal',
    )
  })

  it('nunca passa de attention e o alerta não traz detalhes', () => {
    const ev = evaluateWellbeing([day(11, 1, 2), day(12, 1, 2), day(13, 1, 2)], '2026-11-13', T)!
    const alert = wellbeingAlert(ev, '2026-11-13T08:00:00Z')!
    expect(alert.level).toBe('attention')
    expect(alert.ruleId).toBe('R-MH-01')
    expect(alert.message).not.toMatch(/mood|sleep|\d+(\.\d+)? ?h/i)
    expect(`${alert.title} ${alert.message}`).not.toMatch(/\b(fit|healthy|diagnos|depress)/i)
  })

  it('cenário da demo (dia 120): Head sem alerta', () => {
    const ev = evaluateWellbeing(demoScenario().wellbeing, '2026-11-14')!
    expect(ev).toMatchObject({ mood: 'normal', sleep: 'normal' })
    expect(wellbeingAlert(ev, '2026-11-14T08:00:00Z')).toBeNull()
  })
})
