// Monta o AssistantContext a partir do store (AI-07: a LLM só LÊ isto; nunca muda alertas).
// TODO(Lucas): trocar `deviationPct`/`levelFor` pelas regras reais R-VIT-01/R-VIT-02 (task L1 #52).
import { VITAL_DEVIATION_PCT } from '@/domain/config/thresholds'
import type { AlertLevel, AssistantContext, VitalKind, VitalReading } from '@/domain/types'
import { VITAL_KINDS } from '@/domain/types'
import type { AppState } from '@/state/store'

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)

/** TEMPORÁRIO (R-VIT-01): desvio % da última leitura em relação à média do pré-voo. */
export function deviationPct(kind: VitalKind, vitals: VitalReading[], preflight: VitalReading[]): number {
  const base = mean(preflight.filter((r) => r.kind === kind).map((r) => r.value))
  const last = vitals.filter((r) => r.kind === kind).at(-1)?.value
  if (last === undefined || !Number.isFinite(base) || base === 0) return 0
  return ((last - base) / base) * 100
}

/** TEMPORÁRIO (R-VIT-02): nível pelo desvio absoluto, com os placeholders de P-01. */
export function levelFor(kind: VitalKind, devPct: number): AlertLevel {
  const t = VITAL_DEVIATION_PCT[kind]
  const d = Math.abs(devPct)
  return d >= t.urgent ? 'urgent' : d >= t.attention ? 'attention' : 'normal'
}

export function buildAssistantContext(
  s: Pick<AppState, 'environment' | 'alerts' | 'vitals' | 'preflight' | 'eventReplayed' | 'spaceWeatherEvent'>,
): AssistantContext {
  return {
    missionMode: s.environment,
    activeAlerts: s.alerts,
    vitalsSummary: VITAL_KINDS.map((kind) => {
      const dev = deviationPct(kind, s.vitals, s.preflight)
      return { kind, deviationPct: Math.round(dev * 10) / 10, status: levelFor(kind, dev) }
    }),
    activeEvent: s.eventReplayed && s.spaceWeatherEvent ? s.spaceWeatherEvent : undefined,
  }
}
