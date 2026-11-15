// Seleção do motor do assistente (AI-03, padrão Strategy).
// Usa `protocol` se: ?ai=protocol na URL, navigator.gpu não existe, o init falha, ou uma geração passa de 20 s.
// L7 (Orbit): a resposta é SEMPRE montada pelas regras (reply.ts); o modelo de bordo só pode reescrever o resumo,
// com validação (llm.ts). O semáforo e os alertas não mudam em nenhum caso.
import type { AiMode, AssistantContext, AssistantEngine, ChatMessage } from '@/domain/types'
import { ProtocolEngine } from '@/ai/protocol'
import { OnboardModelEngine } from '@/ai/onboard'
import type { OrbitContext } from '@/ai/context'
import { classify } from '@/ai/intent'
import { FORBIDDEN } from '@/ai/llm'
import { rewriteSummary } from '@/ai/llm'
import { buildReply } from '@/ai/reply'
import type { Intent, StructuredReply, ZoneTarget } from '@/ai/schema'

export { FORBIDDEN }

const protocol = new ProtocolEngine()
let onboard: OnboardModelEngine | null = null

export function canUseOnboardModel(search = window.location.search, nav: Navigator = navigator): boolean {
  return !new URLSearchParams(search).has('ai', 'protocol') && 'gpu' in nav
}

export function engineFor(mode: AiMode): AssistantEngine {
  if (mode === 'protocol') return protocol
  onboard ??= new OnboardModelEngine()
  return onboard
}

/** Motor de bordo compartilhado (o mesmo da escolha de modo). */
export function onboardEngine(): OnboardModelEngine {
  onboard ??= new OnboardModelEngine()
  return onboard
}

export interface ReplyResult {
  text: string
  engine: AiMode
  /** true se a mensagem caiu para o protocolo (erro, tempo limite ou texto proibido). */
  fellBack: boolean
}

/** Resposta em texto livre (contrato antigo, AssistantEngine). Qualquer falha cai para o protocolo. */
export async function replyWithFallback(
  mode: AiMode,
  ctx: AssistantContext,
  history: ChatMessage[],
  userText: string,
): Promise<ReplyResult> {
  if (mode === 'onboard-model') {
    try {
      const text = await engineFor('onboard-model').reply(ctx, history, userText)
      if (text && !FORBIDDEN.test(text)) return { text, engine: 'onboard-model', fellBack: false }
    } catch {
      // cai para o protocolo abaixo
    }
  }
  return { text: await protocol.reply(ctx, history, userText), engine: 'protocol', fellBack: mode !== 'protocol' }
}

export interface OrbitQuestion {
  text: string
  /** Atalho das telas ("Explain with Orbit", "Ask Orbit"): pula a classificação. */
  intent?: Intent
  zone?: ZoneTarget
  crewId?: string
}

/** Resposta determinística (protocolo). Mesma pergunta + mesmo contexto ⇒ mesma resposta. */
export function orbitProtocolAnswer(ctx: OrbitContext, q: OrbitQuestion): StructuredReply {
  const c = classify(q.text)
  const intent = q.intent ?? c.intent
  return buildReply(intent, ctx, { zone: q.zone ?? c.zone, crewId: q.crewId ?? c.crewId, text: q.text })
}

/**
 * Resposta do Orbit. No modo de bordo, o modelo só tenta reescrever o resumo; qualquer falha devolve a resposta
 * determinística intacta. `generate` é injetável para teste.
 */
export async function orbitAnswer(
  ctx: OrbitContext,
  q: OrbitQuestion,
  mode: AiMode,
  generate?: (messages: { role: 'system' | 'user'; content: string }[]) => Promise<string>,
): Promise<StructuredReply> {
  const reply = orbitProtocolAnswer(ctx, q)
  if (mode !== 'onboard-model') return reply
  const gen = generate ?? ((m) => onboardEngine().generate(m))
  return rewriteSummary(reply, gen)
}
