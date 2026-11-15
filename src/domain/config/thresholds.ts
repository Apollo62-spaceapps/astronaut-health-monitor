// PENDENTE P-01 — valores ilustrativos. NENHUM destes números tem fonte clínica.
// A UI mostra o selo "Illustrative thresholds" sempre que eles forem usados (CORE-04).
// Quem decide os valores é o time (Lucas lidera, task L1 #52); registre o motivo ao mudar.
import type { MissionMode, VitalKind } from '@/domain/types'

export const THRESHOLDS_ARE_ILLUSTRATIVE = true as const

/** Desvio % em relação ao baseline pessoal → nível (R-VIT-02). Placeholders. */
export const VITAL_DEVIATION_PCT: Record<VitalKind, { attention: number; urgent: number }> = {
  // PENDENTE P-01 — valores ilustrativos
  heartRate: { attention: 10, urgent: 25 },
  systolicBP: { attention: 10, urgent: 20 },
  diastolicBP: { attention: 10, urgent: 20 },
  glucose: { attention: 15, urgent: 30 },
  bodyTemp: { attention: 1.5, urgent: 3 },
}

/** Janela da média móvel em voo, em dias (Baseline.windowDays). PENDENTE P-01. */
export const INFLIGHT_BASELINE_WINDOW_DAYS = 14

/** % do limite de carreira de radiação → nível (R-RAD-04, P1). PENDENTE P-01. */
export const CAREER_DOSE_PCT = { attention: 75, urgent: 90 }

/** Adesão semanal ao exercício abaixo disto → attention na zona Legs (L5, P1). Nunca urgent (sem fonte).
 * PENDENTE P-01 — valores ilustrativos. */
export const EXERCISE_ADHERENCE_ATTENTION_BELOW_PCT = 70

/** Bem-estar baixo (R-MH-01, P1). PENDENTE P-01. */
export const LOW_WELLBEING = { moodAtOrBelow: 2, forDays: 3, sleepBelowHours: 5 }

// ───────── Referência pessoal por ambiente (L7, Orbit §5B) ─────────

/** Leituras mínimas do exame pré-voo para o baseline não ser "Low-confidence baseline". PENDENTE P-01. */
export const MIN_BASELINE_READINGS = 7

/**
 * Janela de adaptação da referência por ambiente, em dias. PENDENTE P-01 — valores ilustrativos.
 * Igual à janela da R-PHASE-01 (3 dias, S04) para o mapa do corpo e a referência dizerem a mesma coisa.
 */
export const REFERENCE_ADAPTATION_DAYS: Record<MissionMode, number> = { EARTH: 3, ISS: 3, LUNAR: 3, SPACECRAFT: 3 }

/** Leituras mínimas no ambiente para reconstruir a referência adaptada. PENDENTE P-01. */
export const MIN_ADAPTED_READINGS = 3

/** R-TREND-01: dias consecutivos no mesmo sentido para marcar tendência, e quantos dias olhar. PENDENTE P-01. */
export const TREND_MIN_DAYS = 3
export const TREND_LOOKBACK_DAYS = 14

/**
 * R-PROJ-01: projeção linear dos vitais (mínimos quadrados sobre um valor por dia). PENDENTE P-01 — ilustrativo.
 * lookbackDays: dias olhados; minPoints: dias com leitura exigidos; horizonDays: só avisa se a linha seguinte
 * (Attention ou Urgent) for cruzada dentro deste prazo; minR2: qualidade mínima do ajuste (ruído não dispara).
 */
export const PROJECTION = { lookbackDays: 7, minPoints: 5, horizonDays: 7, minR2: 0.5 } as const

// ───────── Crew Risk Outlook (L7, Orbit §5A, R-RISK-01) ─────────

/** Limiares dos "drivers" do risk outlook. PENDENTE P-01 — valores ilustrativos, sem fonte clínica. */
export const RISK_DRIVERS = {
  /** Média de sono dos últimos 3 registros abaixo disto → Guarded / Elevated. */
  sleepGuardedBelowH: 6,
  sleepElevatedBelowH: 5,
  /** Média de humor (1–5) dos últimos 3 registros até isto → Guarded / Elevated. */
  moodGuardedAtOrBelow: 3,
  moodElevatedAtOrBelow: 2,
  /** Adesão semanal ao exercício abaixo disto → Guarded. */
  adherenceGuardedBelowPct: 70,
  /** % do limite de carreira a partir do qual a dose já conta como Guarded (Elevated/High seguem CAREER_DOSE_PCT). */
  doseGuardedPct: 50,
  /** Resposta do solo a partir disto (s) → driver "communication delay" (Guarded). */
  longDelaySec: 600,
} as const

/** Plausibilidade de entrada do "Log measurement" (só bloqueia erro de digitação; NÃO é critério clínico). */
export const INPUT_PLAUSIBILITY: Record<VitalKind, { min: number; max: number }> = {
  heartRate: { min: 20, max: 250 },
  systolicBP: { min: 50, max: 260 },
  diastolicBP: { min: 30, max: 160 },
  glucose: { min: 20, max: 600 },
  bodyTemp: { min: 30, max: 45 },
}
