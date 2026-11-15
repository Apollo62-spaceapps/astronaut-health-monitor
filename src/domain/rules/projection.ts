// R-PROJ-01 e R-PROJ-02: projeção (aviso antecipado). Funções PURAS: sem React, sem store, sem Date.now().
// NÃO é previsão clínica nem diagnóstico: é a reta das próprias leituras da pessoa (ou da taxa de dose com fonte)
// estendida para frente, para dizer "se continuar neste ritmo, cruza a próxima linha em ~N dias".
// Regras de segurança:
// - o aviso de projeção é sempre attention, nunca urgent (quem decide o nível do indicador é a R-VIT-02);
// - só projeta na direção que se afasta do pré-voo, com ajuste bom (R² mínimo) e dados suficientes;
// - linhas = limiares ilustrativos (P-01); a dose usa só a taxa do ambiente com fonte (ENV-04, P-16).
import { CAREER_DOSE_PCT, PROJECTION, VITAL_DEVIATION_PCT } from '@/domain/config/thresholds'
import { dailyValues } from '@/domain/rules/trend'
import { VITAL_ALERT_LABEL, type VitalEvaluation } from '@/domain/rules/vitals'
import type { CareerDose } from '@/domain/rules/radiation'
import type { Alert, VitalKind, VitalReading } from '@/domain/types'

const DAY_MS = 24 * 60 * 60 * 1000

export interface VitalProjection {
  kind: VitalKind
  /** Linha que seria cruzada (a próxima acima do nível atual). */
  toward: 'attention' | 'urgent'
  /** Dias até cruzar, arredondado para cima (≥ 1). */
  daysToLine: number
  /** Valor da linha, na unidade do indicador. */
  lineValue: number
  /** Inclinação do ajuste, por dia. */
  slopePerDay: number
  /** Dias com leitura usados no ajuste. */
  points: number
  r2: number
  level: 'attention'
  ruleId: 'R-PROJ-01'
}

/** Mínimos quadrados: y = a + b·x. Devolve inclinação, intercepto e R². */
export function linearFit(xs: readonly number[], ys: readonly number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = ys.reduce((s, y) => s + y, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx
    const dy = ys[i]! - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy)
  return { slope, intercept: my - slope * mx, r2 }
}

/**
 * R-PROJ-01: projeta um vital contra o próprio pré-voo.
 * null quando: já está urgent, há poucos dias com leitura, o ajuste é ruim, a reta volta para o pré-voo,
 * ou a próxima linha fica além do horizonte.
 */
export function projectVital(
  ev: VitalEvaluation,
  readings: readonly VitalReading[],
  nowIso: string,
  cfg: { lookbackDays: number; minPoints: number; horizonDays: number; minR2: number } = PROJECTION,
): VitalProjection | null {
  if (ev.level === 'urgent') return null
  const ref = ev.baseline.preflightMean
  if (!ref) return null
  const series = dailyValues(ev.kind, readings, nowIso, cfg.lookbackDays)
  if (series.length < cfg.minPoints) return null
  const t0 = Date.parse(`${series[0]!.day}T00:00:00Z`)
  const xs = series.map((d) => (Date.parse(`${d.day}T00:00:00Z`) - t0) / DAY_MS)
  const fit = linearFit(
    xs,
    series.map((d) => d.value),
  )
  if (fit.slope === 0 || fit.r2 < cfg.minR2) return null
  const dir = Math.sign(fit.slope)
  const xLast = xs.at(-1)!
  const fitted = fit.intercept + fit.slope * xLast
  // Só projeta afastando-se do pré-voo (subindo acima dele ou descendo abaixo dele).
  if (Math.sign(fitted - ref) !== dir && Math.abs(fitted - ref) > 1e-9) return null
  const toward = ev.level === 'normal' ? 'attention' : 'urgent'
  const pct = VITAL_DEVIATION_PCT[ev.kind][toward]
  const lineValue = ref * (1 + (dir * pct) / 100)
  const days = (lineValue - fitted) / fit.slope
  if (!(days > 0) || days > cfg.horizonDays) return null
  return {
    kind: ev.kind,
    toward,
    daysToLine: Math.max(1, Math.ceil(days)),
    lineValue,
    slopePerDay: fit.slope,
    points: series.length,
    r2: fit.r2,
    level: 'attention',
    ruleId: 'R-PROJ-01',
  }
}

const LINE_WORD = { attention: 'Attention', urgent: 'Urgent' } as const
export const PROJECTION_SAFE_ACTIONS = ['Re-measure daily', 'Notify CMO if it continues'] as const

/** Aviso antecipado (attention) a partir de uma projeção. Ações só não clínicas (CORE-09). */
export function projectionAlert(p: VitalProjection, nowIso: string): Alert {
  const label = VITAL_ALERT_LABEL[p.kind]
  const days = `${p.daysToLine} day${p.daysToLine === 1 ? '' : 's'}`
  return {
    id: `R-PROJ-01:${p.kind}:${nowIso.slice(0, 10)}`,
    ruleId: 'R-PROJ-01',
    level: 'attention',
    title: `${label} heading toward ${LINE_WORD[p.toward]} in ~${days}`,
    message: `At the pace of your last ${p.points} days, ${label.toLowerCase()} would cross the illustrative ${LINE_WORD[p.toward]} line in about ${days}. This is a projection from your own readings, not a medical assessment. Consult your flight surgeon.`,
    safeActions: [...PROJECTION_SAFE_ACTIONS],
    escalateTo: [],
    createdAt: nowIso,
  }
}

export interface DoseProjection {
  rateMSvPerDay: number
  /** Dias até o limiar de atenção da dose (CAREER_DOSE_PCT.attention); null se já passou. */
  daysToAttention: number | null
  attentionPct: number
  /** Dias até 100% do limite de carreira; null se já passou. */
  daysToLimit: number | null
  /** % do limite daqui a 30 dias, no mesmo ritmo. */
  pctIn30Days: number
  ruleId: 'R-PROJ-02'
}

/**
 * R-PROJ-02: dose de carreira projetada com a taxa do ambiente (só existe onde a taxa tem fonte:
 * Spacecraft, 1,8 mSv/dia [S08, S09]). Sem taxa ou sem total → null (não inventa número, ENV-04).
 */
export function projectDose(dose: CareerDose): DoseProjection | null {
  if (dose.rateMSvPerDay === null || dose.rateMSvPerDay <= 0 || dose.totalMSv === null) return null
  const rate = dose.rateMSvPerDay
  const daysTo = (pct: number) => {
    const d = ((pct / 100) * dose.limitMSv - dose.totalMSv!) / rate
    return d > 0 ? Math.ceil(d) : null
  }
  return {
    rateMSvPerDay: rate,
    daysToAttention: daysTo(CAREER_DOSE_PCT.attention),
    attentionPct: CAREER_DOSE_PCT.attention,
    daysToLimit: daysTo(100),
    pctIn30Days: ((dose.totalMSv + 30 * rate) / dose.limitMSv) * 100,
    ruleId: 'R-PROJ-02',
  }
}
