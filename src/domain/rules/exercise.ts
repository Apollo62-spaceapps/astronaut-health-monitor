// Regras de exercício (SPEC §7, §6.4): R-EX-01 (adesão semanal) e R-EX-02 (abrigo → postponed).
// O sistema NÃO prescreve nem altera o plano (EX-05). Funções PURAS.
import type { ExerciseSession } from '@/domain/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Datas (AAAA-MM-DD) dos últimos `days` dias até `todayIso`, inclusive. */
function windowFrom(todayIso: string, days: number): string {
  return new Date(Date.parse(todayIso.slice(0, 10)) - (days - 1) * DAY_MS).toISOString().slice(0, 10)
}

export interface Adherence {
  /** null = nenhum minuto prescrito na janela. */
  pct: number | null
  doneMin: number
  prescribedMin: number
  days: number
  ruleId: 'R-EX-01'
}

/**
 * R-EX-01: adesão semanal % = minutos feitos ÷ minutos prescritos (EX-03), nos últimos 7 dias até hoje.
 * Sessões `postponed` (ex.: abrigo) ficam FORA da conta: adiar por segurança não conta como falta.
 */
export function weeklyAdherence(sessions: readonly ExerciseSession[], todayIso: string, days = 7): Adherence {
  const today = todayIso.slice(0, 10)
  const from = windowFrom(todayIso, days)
  const inWindow = sessions.filter((s) => s.date >= from && s.date <= today && s.status !== 'postponed')
  const prescribedMin = inWindow.reduce((a, s) => a + s.prescribedMin, 0)
  const doneMin = inWindow.reduce((a, s) => a + Math.min(s.doneMin, s.prescribedMin), 0)
  return {
    pct: prescribedMin > 0 ? (doneMin / prescribedMin) * 100 : null,
    doneMin,
    prescribedMin,
    days,
    ruleId: 'R-EX-01',
  }
}

/** Sequência de dias seguidos (até hoje) com todas as sessões `done` (EX-04, P1). Dia sem sessão quebra. */
export function streakDays(sessions: readonly ExerciseSession[], todayIso: string): number {
  const byDay = new Map<string, ExerciseSession[]>()
  for (const s of sessions) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s])
  let streak = 0
  let t = Date.parse(todayIso.slice(0, 10))
  for (;;) {
    const day = byDay.get(new Date(t).toISOString().slice(0, 10))
    if (!day || day.length === 0 || !day.every((s) => s.status === 'done')) return streak
    streak++
    t -= DAY_MS
  }
}

/** R-EX-02: abrigo ativo → sessões de hoje ainda não feitas viram `postponed` ("shelter active") (RAD-05). */
export function applyShelter(
  sessions: readonly ExerciseSession[],
  todayIso: string,
  shelterActive: boolean,
): ExerciseSession[] {
  if (!shelterActive) return [...sessions]
  const today = todayIso.slice(0, 10)
  return sessions.map((s) =>
    s.date === today && s.status !== 'done' ? { ...s, status: 'postponed', reason: 'shelter active' } : s,
  )
}
