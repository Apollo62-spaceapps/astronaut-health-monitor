// R-MH-01 (SPEC §7, P1): registros de bem-estar → alerta de bem-estar baixo.
// Os números vêm de LOW_WELLBEING em config/thresholds.ts (PENDENTE P-01 — valores ilustrativos).
// Autorrelato simples, NÃO é instrumento validado (§6.3). Nunca diagnóstico.
// Por falta de fonte, o nível máximo é `attention` (nunca urgent).
// Função PURA (sem React, sem store).
import { LOW_WELLBEING } from '@/domain/config/thresholds'
import type { Alert, AlertLevel, WellbeingEntry } from '@/domain/types'

export interface WellbeingEvaluation {
  /** Nível do humor (indicador 'mood' do mapa do corpo). */
  mood: AlertLevel
  /** Nível do sono (indicador 'sleep' do mapa do corpo). */
  sleep: AlertLevel
  /** Dias considerados (os últimos `forDays` registros até hoje). */
  days: number
  ruleId: 'R-MH-01'
  illustrativeThresholds: true
}

/**
 * R-MH-01: os últimos `forDays` registros (até `todayIso`) estão TODOS abaixo do limiar?
 * - humor <= moodAtOrBelow em todos → mood = attention;
 * - sono < sleepBelowHours em todos → sleep = attention.
 * Com menos registros do que `forDays`, não há sequência: devolve null (sem dado suficiente).
 */
export function evaluateWellbeing(
  entries: readonly WellbeingEntry[],
  todayIso: string,
  t: typeof LOW_WELLBEING = LOW_WELLBEING,
): WellbeingEvaluation | null {
  const today = todayIso.slice(0, 10)
  const recent = [...entries]
    .filter((e) => e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-t.forDays)
  if (recent.length < t.forDays) return null
  const lowMood = recent.every((e) => e.mood <= t.moodAtOrBelow)
  const lowSleep = recent.every((e) => e.sleepHours < t.sleepBelowHours)
  return {
    mood: lowMood ? 'attention' : 'normal',
    sleep: lowSleep ? 'attention' : 'normal',
    days: t.forDays,
    ruleId: 'R-MH-01',
    illustrativeThresholds: true,
  }
}

/**
 * Alerta de bem-estar baixo. Sem detalhes (humor/sono) no texto: o CMO pode receber só o NÍVEL
 * com consentimento (MH-04). `escalateTo` sai vazio; quem decide é o engine (consentimento + R-ESC-01).
 */
export function wellbeingAlert(ev: WellbeingEvaluation, nowIso: string): Alert | null {
  if (ev.mood === 'normal' && ev.sleep === 'normal') return null
  return {
    id: `R-MH-01:${nowIso.slice(0, 10)}`,
    ruleId: 'R-MH-01',
    level: 'attention',
    title: 'Wellbeing check-ins below your usual range',
    message: `Your last ${ev.days} check-ins were below the illustrative range. You can notify the CMO.`,
    safeActions: ['Notify CMO'],
    escalateTo: [],
    createdAt: nowIso,
  }
}
