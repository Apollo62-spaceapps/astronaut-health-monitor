// PENDENTE P-01 — valores ilustrativos. NENHUM destes números tem fonte clínica.
// A UI mostra o selo "Illustrative thresholds" sempre que eles forem usados (CORE-04).
// Quem decide os valores é o time (Lucas lidera, task L1 #52); registre o motivo ao mudar.
import type { VitalKind } from '@/domain/types'

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

/** Bem-estar baixo (R-MH-01, P1). PENDENTE P-01. */
export const LOW_WELLBEING = { moodAtOrBelow: 2, forDays: 3, sleepBelowHours: 5 }

/** Plausibilidade de entrada do "Log measurement" (só bloqueia erro de digitação; NÃO é critério clínico). */
export const INPUT_PLAUSIBILITY: Record<VitalKind, { min: number; max: number }> = {
  heartRate: { min: 20, max: 250 },
  systolicBP: { min: 50, max: 260 },
  diastolicBP: { min: 30, max: 160 },
  glucose: { min: 20, max: 600 },
  bodyTemp: { min: 30, max: 45 },
}
