// Referência pessoal em camadas (L7, Orbit §5B). Função PURA, sem relógio próprio (o tempo entra como parâmetro).
// 1) Pré-voo (exame na Terra): a âncora, com a qualidade do baseline.
// 2) Referência do ambiente: depois de uma troca de gravidade há uma janela de adaptação (os desvios que seriam
//    attention aparecem como Adapting pela R-PHASE-01; urgent nunca é mascarado). Passada a janela, a referência é
//    reconstruída com as leituras do próprio ambiente. Na Terra (retorno), a comparação é sempre com o pré-voo.
// 3) Limites absolutos: sem fonte clínica no catálogo → não existem números (P-01/P-12).
// O NÍVEL do indicador continua sendo da R-VIT-02 (vs pré-voo); esta regra só explica de onde vem a referência.
import {
  INFLIGHT_BASELINE_WINDOW_DAYS,
  MIN_ADAPTED_READINGS,
  MIN_BASELINE_READINGS,
  REFERENCE_ADAPTATION_DAYS,
} from '@/domain/config/thresholds'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { NO_SOURCED_SHIFT, referenceShift, type ReferenceShift } from '@/domain/config/referenceShifts'
import { gravityChanged, inAdaptation } from '@/domain/rules/phase'
import { readingsOf } from '@/domain/rules/vitals'
import type { MissionMode, VitalKind, VitalReading } from '@/domain/types'

const DAY_MS = 24 * 60 * 60 * 1000

export const ABSOLUTE_LIMITS_TEXT = 'Absolute limits: not sourced — consult your flight surgeon.'

export interface BaselineQuality {
  kind: VitalKind
  /** Leituras do exame pré-voo. */
  n: number
  mean: number
  /** Desvio-padrão amostral (dispersão). */
  sd: number
  fromIso: string
  toIso: string
  /** Menos de MIN_BASELINE_READINGS leituras → "Low-confidence baseline" (nunca inventar dado). */
  lowConfidence: boolean
}

/** Qualidade do baseline pré-voo de um indicador. null = sem exame pré-voo para ele. */
export function baselineQuality(kind: VitalKind, preflight: readonly VitalReading[]): BaselineQuality | null {
  const rs = readingsOf(kind, preflight)
  if (rs.length === 0) return null
  const values = rs.map((r) => r.value)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = values.length > 1 ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1)) : 0
  return {
    kind,
    n: rs.length,
    mean,
    sd,
    fromIso: rs[0]!.takenAt,
    toIso: rs.at(-1)!.takenAt,
    lowConfidence: rs.length < MIN_BASELINE_READINGS,
  }
}

export type ReferenceOrigin = 'pre-flight' | 'adapting' | 'adapted'

export interface ReferenceState {
  kind: VitalKind
  environment: MissionMode
  origin: ReferenceOrigin
  /** Valor da referência vigente. */
  referenceValue: number
  preflightMean: number
  latest: number | null
  /** Desvio da última leitura vs pré-voo (mesma conta da R-VIT-01). */
  vsPreflightPct: number | null
  /** Desvio da última leitura vs a referência vigente. */
  vsReferencePct: number | null
  /** Fim da janela de adaptação (só quando origin = 'adapting'). */
  adaptationEndsIso: string | null
  /** Leituras do ambiente usadas na referência adaptada. */
  readingsUsed: number
  shift: ReferenceShift | undefined
  /** Texto quando não há mudança com fonte para o ambiente (ENV-04). */
  shiftNote: string | null
  ruleId: 'R-REF-01'
}

const pct = (value: number, base: number) => (base === 0 ? null : ((value - base) / base) * 100)

export interface ReferenceInput {
  kind: VitalKind
  preflight: readonly VitalReading[]
  readings: readonly VitalReading[]
  environment: MissionMode
  nowIso: string
  /** Última troca de campo gravitacional (state/phase.ts). null = nenhuma nesta sessão. */
  gravityChangeIso: string | null | undefined
}

/** R-REF-01: qual é a referência vigente do indicador neste ambiente, e de onde ela vem. */
export function referenceFor(input: ReferenceInput): ReferenceState | null {
  const q = baselineQuality(input.kind, input.preflight)
  if (!q) return null
  const now = Date.parse(input.nowIso)
  const series = readingsOf(input.kind, input.readings).filter((r) => Date.parse(r.takenAt) <= now)
  const latest = series.at(-1)?.value ?? null
  const shift = referenceShift(input.environment, input.kind)
  const base = {
    kind: input.kind,
    environment: input.environment,
    preflightMean: q.mean,
    latest,
    vsPreflightPct: latest === null ? null : pct(latest, q.mean),
    shift,
    shiftNote: input.environment === 'EARTH' || shift ? null : NO_SOURCED_SHIFT,
    ruleId: 'R-REF-01' as const,
  }
  const preflightRef = (origin: ReferenceOrigin, adaptationEndsIso: string | null = null): ReferenceState => ({
    ...base,
    origin,
    referenceValue: q.mean,
    vsReferencePct: base.vsPreflightPct,
    adaptationEndsIso,
    readingsUsed: 0,
  })

  // Na Terra (pré-voo e retorno) a referência é sempre o exame pré-voo.
  if (input.environment === 'EARTH') return preflightRef('pre-flight')

  const windowDays = REFERENCE_ADAPTATION_DAYS[input.environment]
  if (inAdaptation(input.gravityChangeIso, input.nowIso, windowDays)) {
    const ends = new Date(Date.parse(input.gravityChangeIso!) + windowDays * DAY_MS).toISOString()
    return preflightRef('adapting', ends)
  }

  // Referência do ambiente: média móvel das leituras feitas aqui (desde a troca), como o inflightMean.
  const from = Math.max(
    now - INFLIGHT_BASELINE_WINDOW_DAYS * DAY_MS,
    input.gravityChangeIso ? Date.parse(input.gravityChangeIso) : -Infinity,
  )
  const used = series.filter((r) => Date.parse(r.takenAt) > from)
  if (used.length < MIN_ADAPTED_READINGS) return preflightRef('pre-flight')
  const mean = used.reduce((a, r) => a + r.value, 0) / used.length
  return {
    ...base,
    origin: 'adapted',
    referenceValue: mean,
    vsReferencePct: latest === null ? null : pct(latest, mean),
    adaptationEndsIso: null,
    readingsUsed: used.length,
  }
}

export type TransitionKind =
  | 'same-gravity'
  | 'enter-microgravity'
  | 'enter-partial-gravity'
  | 'microgravity-to-partial'
  | 'partial-to-microgravity'
  | 'return-to-earth'

export interface ReferenceTransition {
  from: MissionMode
  to: MissionMode
  kind: TransitionKind
  /** Abre a janela de adaptação (troca de campo gravitacional). */
  opensWindow: boolean
  windowDays: number
  /** Contra o que o desvio é medido depois da troca. Retorno à Terra → pré-voo. */
  comparesWith: 'preflight' | 'adapted'
  text: string
}

const GRAVITY_TEXT = { earth: 'Earth gravity', micro: 'microgravity', partial: 'partial gravity' } as const

/** Descrição da troca de ambiente para o Orbit e a tela de referência. Gravidade lunar sem fração (P-17). */
export function referenceTransition(from: MissionMode, to: MissionMode): ReferenceTransition {
  const gf = ENVIRONMENTS[from].gravity
  const gt = ENVIRONMENTS[to].gravity
  const opensWindow = gravityChanged(from, to)
  const kind: TransitionKind = !opensWindow
    ? 'same-gravity'
    : gt === 'earth'
      ? 'return-to-earth'
      : gf === 'earth'
        ? gt === 'micro'
          ? 'enter-microgravity'
          : 'enter-partial-gravity'
        : gt === 'partial'
          ? 'microgravity-to-partial'
          : 'partial-to-microgravity'
  const windowDays = REFERENCE_ADAPTATION_DAYS[to]
  const text = !opensWindow
    ? 'Same gravity field: your reference carries over.'
    : kind === 'return-to-earth'
      ? `Back to Earth gravity: readings are compared with your pre-flight exam. Adaptation window: ${windowDays} days (illustrative).`
      : `From ${GRAVITY_TEXT[gf]} to ${GRAVITY_TEXT[gt]}: your reference is being rebuilt. Adaptation window: ${windowDays} days (illustrative). Urgent is never masked.`
  return { from, to, kind, opensWindow, windowDays, comparesWith: to === 'EARTH' ? 'preflight' : 'adapted', text }
}
