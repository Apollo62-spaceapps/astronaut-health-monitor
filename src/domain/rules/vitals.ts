// Regras de sinais vitais (SPEC §7): R-VIT-01 (desvio %) e R-VIT-02 (nível).
// Funções PURAS: sem React, sem store, sem Date.now(). O tempo entra como parâmetro.
// Os limiares vêm de config/thresholds.ts (PENDENTE P-01 — valores ilustrativos, CORE-04).
import { INFLIGHT_BASELINE_WINDOW_DAYS, VITAL_DEVIATION_PCT } from '@/domain/config/thresholds'
import type { Alert, AlertLevel, Baseline, VitalKind, VitalReading } from '@/domain/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Ordem de gravidade, do menos ao mais grave. */
export const ALERT_LEVEL_ORDER: readonly AlertLevel[] = ['normal', 'attention', 'urgent']

/** Ações permitidas em alertas de vitais: SÓ não clínicas (CORE-09). */
export const VITAL_SAFE_ACTIONS = ['Re-measure', 'Notify CMO', 'Follow the onboard medical checklist'] as const

/** Rótulos da UI (inglês) usados no título do alerta. */
export const VITAL_ALERT_LABEL: Record<VitalKind, string> = {
  heartRate: 'Resting heart rate',
  systolicBP: 'Systolic blood pressure',
  diastolicBP: 'Diastolic blood pressure',
  glucose: 'Blood glucose',
  bodyTemp: 'Body temperature',
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)

/** Leituras de um indicador, em ordem cronológica. */
export function readingsOf(kind: VitalKind, readings: readonly VitalReading[]): VitalReading[] {
  return readings.filter((r) => r.kind === kind).sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt))
}

/**
 * Baseline pessoal de um indicador.
 * - preflightMean: média do exame pré-voo.
 * - inflightMean: média móvel das leituras em voo dos últimos `windowDays` dias até `nowIso` (inclusive).
 * Devolve null se não houver leitura pré-voo (sem baseline não há desvio).
 */
export function buildBaseline(
  kind: VitalKind,
  preflight: readonly VitalReading[],
  inflight: readonly VitalReading[],
  nowIso: string,
  windowDays: number = INFLIGHT_BASELINE_WINDOW_DAYS,
): Baseline | null {
  const preflightMean = mean(readingsOf(kind, preflight).map((r) => r.value))
  if (!Number.isFinite(preflightMean)) return null
  const now = Date.parse(nowIso)
  const from = now - windowDays * DAY_MS
  const window = readingsOf(kind, inflight).filter((r) => {
    const t = Date.parse(r.takenAt)
    return t > from && t <= now
  })
  const inflightMean = mean(window.map((r) => r.value))
  return {
    kind,
    preflightMean,
    // Sem leitura em voo na janela, a média em voo cai para o pré-voo (não inventa tendência).
    inflightMean: Number.isFinite(inflightMean) ? inflightMean : preflightMean,
    windowDays,
  }
}

/**
 * R-VIT-01: leitura + baseline → desvio % (aritmética).
 * Referência padrão = baseline pré-voo (é a linha "+18% vs pre-flight" da tela de referência).
 * Devolve null quando o baseline é 0 ou inválido (divisão impossível).
 */
export function deviationPct(
  value: number,
  baseline: Baseline,
  reference: 'preflight' | 'inflight' = 'preflight',
): number | null {
  const base = reference === 'preflight' ? baseline.preflightMean : baseline.inflightMean
  if (!Number.isFinite(base) || base === 0 || !Number.isFinite(value)) return null
  return ((value - base) / base) * 100
}

/**
 * R-VIT-02: desvio % → normal / attention / urgent.
 * Usa o desvio ABSOLUTO (subir ou descer do baseline conta igual) e compara com >=.
 * Os testes checam a lógica, não os valores (PENDENTE P-01).
 */
export function vitalLevel(
  kind: VitalKind,
  devPct: number,
  thresholds: Record<VitalKind, { attention: number; urgent: number }> = VITAL_DEVIATION_PCT,
): AlertLevel {
  const t = thresholds[kind]
  const d = Math.abs(devPct)
  if (d >= t.urgent) return 'urgent'
  if (d >= t.attention) return 'attention'
  return 'normal'
}

export interface VitalEvaluation {
  kind: VitalKind
  latest: VitalReading
  baseline: Baseline
  /** Desvio % da última leitura vs baseline pré-voo (R-VIT-01). */
  deviationPct: number
  level: AlertLevel
  ruleIds: readonly ['R-VIT-01', 'R-VIT-02']
  /** Sempre true enquanto P-01 não tiver fonte → UI mostra "Illustrative thresholds" (CORE-04). */
  illustrativeThresholds: true
}

/**
 * Avalia um indicador: última leitura até `nowIso` → baseline → desvio → nível.
 * null = sem leitura ou sem baseline (a tela mostra "No data", nunca "Normal").
 */
export function evaluateVital(
  kind: VitalKind,
  inflight: readonly VitalReading[],
  preflight: readonly VitalReading[],
  nowIso: string,
): VitalEvaluation | null {
  const now = Date.parse(nowIso)
  const latest = readingsOf(kind, inflight)
    .filter((r) => Date.parse(r.takenAt) <= now)
    .at(-1)
  if (!latest) return null
  const baseline = buildBaseline(kind, preflight, inflight, nowIso)
  if (!baseline) return null
  const dev = deviationPct(latest.value, baseline)
  if (dev === null) return null
  return {
    kind,
    latest,
    baseline,
    deviationPct: dev,
    level: vitalLevel(kind, dev),
    ruleIds: ['R-VIT-01', 'R-VIT-02'],
    illustrativeThresholds: true,
  }
}

/** Avalia todos os indicadores informados (padrão: os 5 vitais). Os sem dado ficam de fora. */
export function evaluateVitals(
  kinds: readonly VitalKind[],
  inflight: readonly VitalReading[],
  preflight: readonly VitalReading[],
  nowIso: string,
): VitalEvaluation[] {
  return kinds.map((k) => evaluateVital(k, inflight, preflight, nowIso)).filter((e) => e !== null)
}

/** Desvio formatado para a UI: "+18%" / "-4%" (1 casa só abaixo de 10%). */
export function formatDeviation(devPct: number): string {
  const abs = Math.abs(devPct)
  const rounded = abs < 10 ? Math.round(abs * 10) / 10 : Math.round(abs)
  return `${devPct < 0 ? '-' : '+'}${rounded}%`
}

/**
 * Alerta de um vital fora do normal (R-VIT-02). Só ações não clínicas (CORE-09).
 * `escalateTo` sai vazio: quem preenche é R-ESC-01 (escalation.ts, L2).
 */
export function vitalAlert(evaluation: VitalEvaluation, nowIso: string): Alert | null {
  if (evaluation.level === 'normal') return null
  const label = VITAL_ALERT_LABEL[evaluation.kind]
  const dev = formatDeviation(evaluation.deviationPct)
  return {
    id: `R-VIT-02:${evaluation.kind}:${evaluation.latest.takenAt}`,
    ruleId: 'R-VIT-02',
    level: evaluation.level,
    title: `${label} ${dev} vs your pre-flight baseline`,
    message: `${label} is ${dev} from your own pre-flight baseline (illustrative thresholds). Consult your flight surgeon.`,
    safeActions: [...VITAL_SAFE_ACTIONS],
    escalateTo: [],
    createdAt: nowIso,
  }
}
