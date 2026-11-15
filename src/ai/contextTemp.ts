// Monta o AssistantContext a partir do store (AI-07: a LLM só LÊ isto; nunca muda alertas).
// Antes era temporário; agora usa as regras reais R-VIT-01/R-VIT-02 (L1 #52) e o engine (L2 #53).
// Mantém a assinatura antiga para não quebrar o assistente (K7).
import { buildBaseline, deviationPct as ruleDeviationPct, vitalLevel } from '@/domain/rules/vitals'
import { buildAssistantContext as engineContext } from '@/domain/rules/engine'
import type { AlertLevel, AssistantContext, VitalKind, VitalReading } from '@/domain/types'
import { VITAL_KINDS } from '@/domain/types'
import type { AppState } from '@/state/store'

/** R-VIT-01: desvio % da última leitura vs baseline pré-voo (sem relógio: usa a última leitura). */
export function deviationPct(kind: VitalKind, vitals: VitalReading[], preflight: VitalReading[]): number {
  const latest = vitals.filter((r) => r.kind === kind).at(-1)
  if (!latest) return 0
  const baseline = buildBaseline(kind, preflight, vitals, latest.takenAt)
  return (baseline && ruleDeviationPct(latest.value, baseline)) ?? 0
}

/** R-VIT-02 com os limiares de config/thresholds.ts. */
export function levelFor(kind: VitalKind, devPct: number): AlertLevel {
  return vitalLevel(kind, devPct)
}

type CtxState = Pick<
  AppState,
  'environment' | 'alerts' | 'vitals' | 'preflight' | 'eventReplayed' | 'spaceWeatherEvent'
>

/** Contexto do assistente. Com o store completo, delega ao engine (privacidade incluída). */
export function buildAssistantContext(s: CtxState | AppState): AssistantContext {
  if ('simNowIso' in s && 'role' in s) {
    const ctx = engineContext({
      environment: s.environment,
      role: s.role,
      vitals: s.vitals,
      preflight: s.preflight,
      wellbeing: s.wellbeing,
      exercise: s.exercise,
      radiation: s.radiation,
      missionDay: s.missionDay,
      simNowIso: s.simNowIso,
      spaceWeatherEvent: s.spaceWeatherEvent,
      eventReplayed: s.eventReplayed,
      shelterActive: s.shelterActive,
      consent: s.consent,
      breakGlass: s.breakGlass,
    })
    return ctx
  }
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
