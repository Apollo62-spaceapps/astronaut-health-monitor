// Contrato de resposta do Orbit (L7 §4) e saída do LLM. Tipos novos ficam aqui (types.ts não muda).
import { z } from 'zod'
import type { BodyZoneId, Hazard, SourceId, VitalKind, ZoneStatus } from '@/domain/types'
import type { TabId } from '@/app/tabs'
import type { RiskLevel } from '@/domain/rules/risk'

export const INTENTS = [
  'status',
  'whatNow',
  'zoneExplain',
  'solarEvent',
  'groundDelay',
  'routine',
  'triage',
  'prepareReport',
  'privacy',
  'riskOutlook',
  'reference',
  'drift',
  'about',
  'general',
] as const
export type Intent = (typeof INTENTS)[number]

export type ZoneTarget = BodyZoneId | 'radiation'

export interface Fact {
  label: string
  value: string
  unit?: string
  provenance: 'REAL' | 'SIMULATED'
  sourceId?: SourceId
  zone?: ZoneTarget
  /** Status do indicador (cor + ícone + texto na UI). */
  status?: ZoneStatus
  /** Detalhe curto em mono/cinza, ex.: "+18% vs pre-flight". */
  detail?: string
}

/** Linha de status (zona, item de rotina, tripulante) mostrada como lista no cartão. */
export interface StatusLine {
  label: string
  status?: ZoneStatus
  risk?: RiskLevel
  /** Estado neutro da rotina (Due/Overdue/Done/Postponed), nunca cor de saúde (ROUT-02). */
  neutral?: string
  detail?: string
}

export type ReplyAction =
  | { kind: 'remeasure'; vital: VitalKind }
  | { kind: 'notifyCmo' }
  | { kind: 'openChecklist' }
  | { kind: 'goto'; tab: TabId; label: string }
  | { kind: 'startTriage' }

export interface StructuredReply {
  id: string
  intent: Intent
  /** 1–2 frases (determinístico; o LLM pode reescrever). */
  summary: string
  facts: Fact[]
  lines?: StatusLine[]
  why?: { text: string; hazard?: Hazard; sourceIds: SourceId[] }
  actions: ReplyAction[]
  escalate?: { level: 'consider' | 'recommended'; reason: string; etaText: string }
  limits?: string[]
  /** Usa limiares de P-01 → o cartão mostra "Illustrative thresholds". */
  illustrative?: boolean
  /** Texto fixo extra (ex.: aviso do outlook ou da triagem). */
  note?: string
  /** Relato da triagem, anexado ao pacote quando a pessoa usa Notify CMO. */
  report?: string
  engine: 'protocol' | 'onboard-model'
}

/** Saída do LLM: só o resumo (≤ 280 caracteres). */
export const llmOutputSchema = z.object({ summary: z.string().min(1).max(280) })

const sourceId = z.string().regex(/^S\d+$/)
export const structuredReplySchema = z.object({
  id: z.string(),
  intent: z.enum(INTENTS),
  summary: z.string().min(1).max(600),
  facts: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      unit: z.string().optional(),
      provenance: z.enum(['REAL', 'SIMULATED']),
      sourceId: sourceId.optional(),
      zone: z.string().optional(),
      status: z.string().optional(),
      detail: z.string().optional(),
    }),
  ),
  actions: z.array(
    z.object({ kind: z.enum(['remeasure', 'notifyCmo', 'openChecklist', 'goto', 'startTriage']) }).passthrough(),
  ),
  why: z.object({ text: z.string(), hazard: z.string().optional(), sourceIds: z.array(sourceId) }).optional(),
  escalate: z
    .object({ level: z.enum(['consider', 'recommended']), reason: z.string(), etaText: z.string() })
    .optional(),
  engine: z.enum(['protocol', 'onboard-model']),
})
