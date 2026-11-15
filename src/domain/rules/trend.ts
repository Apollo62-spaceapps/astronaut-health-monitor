// R-TREND-01 (L7, Orbit §5B): tendência silenciosa. Função PURA.
// Mudança no mesmo sentido por N dias seguidos (valor do dia = última leitura do dia), afastando-se da referência,
// mesmo com o valor ainda Normal. Gera aviso preventivo de nível attention ("Trend"), NUNCA urgent e nunca
// diagnóstico. O motor de regras continua dono do nível do indicador (R-VIT-02).
import { TREND_LOOKBACK_DAYS, TREND_MIN_DAYS } from '@/domain/config/thresholds'
import { readingsOf } from '@/domain/rules/vitals'
import type { VitalKind, VitalReading } from '@/domain/types'

const DAY_MS = 24 * 60 * 60 * 1000

export interface Trend {
  kind: VitalKind
  direction: 'up' | 'down'
  /** Dias seguidos no mesmo sentido. */
  days: number
  /** Inclinação média no período (unidade do indicador por dia). */
  slopePerDay: number
  comparedTo: 'preflight' | 'adapted'
  /** Desvio da última leitura vs a referência usada. */
  latestDevPct: number
  /** Aviso preventivo: sempre attention, nunca urgent. */
  level: 'attention'
  ruleId: 'R-TREND-01'
}

/** Um valor por dia (a última leitura de cada dia), dos últimos `lookbackDays` dias até `nowIso`. */
export function dailyValues(
  kind: VitalKind,
  readings: readonly VitalReading[],
  nowIso: string,
  lookbackDays = TREND_LOOKBACK_DAYS,
): { day: string; value: number }[] {
  const now = Date.parse(nowIso)
  const from = now - lookbackDays * DAY_MS
  const byDay = new Map<string, number>()
  for (const r of readingsOf(kind, readings)) {
    const t = Date.parse(r.takenAt)
    if (t > from && t <= now) byDay.set(r.takenAt.slice(0, 10), r.value)
  }
  return [...byDay.entries()].map(([day, value]) => ({ day, value }))
}

/**
 * R-TREND-01 sobre uma série diária: conta, a partir do fim, os passos seguidos com o mesmo sinal.
 * Passo igual a zero ou troca de sinal interrompe (ruído alternado não dispara). Só vale se a última leitura
 * estiver do mesmo lado da referência que a direção (afastando-se dela, não voltando).
 */
export function trendFromSeries(
  kind: VitalKind,
  values: readonly number[],
  reference: { value: number; comparedTo: 'preflight' | 'adapted' },
  minDays = TREND_MIN_DAYS,
): Trend | null {
  if (values.length < minDays + 1 || reference.value === 0) return null
  const last = values.at(-1)!
  let sign = 0
  let days = 0
  for (let i = values.length - 1; i > 0; i--) {
    const step = Math.sign(values[i]! - values[i - 1]!)
    if (step === 0 || (sign !== 0 && step !== sign)) break
    sign = step
    days++
  }
  if (days < minDays || sign === 0) return null
  if (Math.sign(last - reference.value) !== sign) return null
  const start = values[values.length - 1 - days]!
  return {
    kind,
    direction: sign > 0 ? 'up' : 'down',
    days,
    slopePerDay: (last - start) / days,
    comparedTo: reference.comparedTo,
    latestDevPct: ((last - reference.value) / reference.value) * 100,
    level: 'attention',
    ruleId: 'R-TREND-01',
  }
}

/** R-TREND-01 a partir das leituras. */
export function detectTrend(
  kind: VitalKind,
  readings: readonly VitalReading[],
  nowIso: string,
  reference: { value: number; comparedTo: 'preflight' | 'adapted' },
  minDays = TREND_MIN_DAYS,
): Trend | null {
  return trendFromSeries(
    kind,
    dailyValues(kind, readings, nowIso).map((d) => d.value),
    reference,
    minDays,
  )
}
