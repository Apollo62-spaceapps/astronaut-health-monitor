// Seleção do motor do assistente (AI-03, padrão Strategy).
// Usa `protocol` se: ?ai=protocol na URL, navigator.gpu não existe, o init falha, ou uma geração passa de 20 s.
import type { AiMode, AssistantContext, AssistantEngine, ChatMessage } from '@/domain/types'
import { ProtocolEngine } from '@/ai/protocol'
import { OnboardModelEngine } from '@/ai/onboard'

/** Palavras que o assistente nunca pode dizer (BODY-07). Se a LLM disser, a resposta cai para o protocolo. */
export const FORBIDDEN = /\b(fit|unfit|healthy|diagnos\w*|prescri\w*)\b/i

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

export interface ReplyResult {
  text: string
  engine: AiMode
  /** true se a mensagem caiu para o protocolo (erro, tempo limite ou texto proibido). */
  fellBack: boolean
}

/** Responde com o motor pedido; qualquer falha cai para o protocolo, sem perder o estado. */
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
