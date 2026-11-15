// Seleção do motor do assistente (AI-03, padrão Strategy).
// Usa `protocol` se: ?ai=protocol na URL, navigator.gpu não existe, o init falha, ou uma geração passa de 20 s.
// L7 (Orbit): a resposta é SEMPRE montada pelas regras (reply.ts); o modelo de bordo só pode reescrever o resumo,
// com validação (llm.ts). O semáforo e os alertas não mudam em nenhum caso.
import type { AiMode, AssistantContext, AssistantEngine, ChatMessage } from '@/domain/types'
import { ProtocolEngine } from '@/ai/protocol'
import { OnboardModelEngine } from '@/ai/onboard'
import type { OrbitContext } from '@/ai/context'
import { classify, classifyAll, isFollowUp } from '@/ai/intent'
import { followUpAnswer, narrate } from '@/ai/narrate'
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
/** Modelo do motor já criado (sem criar um novo): o rótulo do modo de IA mostra o que está carregado de fato. */
export function currentOnboardModelId(): string | undefined {
  return onboard?.modelId
}

export function onboardEngine(modelId?: string): OnboardModelEngine {
  // Trocar de modelo cria outro motor (o anterior fica para o coletor de lixo).
  if (modelId && onboard?.modelId !== modelId) onboard = new OnboardModelEngine(modelId)
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
  /** Resposta anterior do Orbit: "why?" / "tell me more" aprofundam o mesmo assunto. */
  previous?: StructuredReply
}

/** Resposta determinística (protocolo). Mesma pergunta + mesmo contexto ⇒ mesma resposta. */
export function orbitProtocolAnswer(ctx: OrbitContext, q: OrbitQuestion): StructuredReply {
  // Seguimento ("why?", "tell me more"): aprofunda a resposta anterior com a base local, sem repetir as ações.
  if (q.previous && !q.intent && isFollowUp(q.text)) {
    const n = followUpAnswer(q.previous, ctx)
    return {
      id: `followUp:${q.previous.id}`,
      intent: q.previous.intent,
      summary: n.prose[0]!,
      prose: n.prose,
      consulted: n.consulted,
      followUps: n.followUps,
      facts: [],
      actions: [],
      engine: 'protocol',
    }
  }
  const c = classify(q.text)
  const intent = q.intent ?? c.intent
  const opts = { zone: q.zone ?? c.zone, crewId: q.crewId ?? c.crewId, text: q.text }
  const first = answerFor(intent, ctx, opts)
  // Pergunta composta ("how am I doing and what should I do?"): responde as duas partes num texto só (L8).
  if (!q.intent) {
    const ranked = classifyAll(q.text)
    const second = ranked.find(([i]) => i !== intent && COMBINABLE.includes(i))
    const best = ranked[0]?.[1] ?? 0
    if (second && COMBINABLE.includes(intent) && second[1] >= 1.5 && second[1] >= best * 0.6)
      return merge(first, answerFor(second[0], ctx, opts))
  }
  return first
}

/** Intenções que fazem sentido juntas numa resposta só. */
const COMBINABLE: readonly Intent[] = ['status', 'whatNow', 'zoneExplain', 'solarEvent', 'groundDelay', 'routine', 'drift', 'reference', 'riskOutlook', 'metric', 'environment']

function answerFor(intent: Intent, ctx: OrbitContext, opts: { zone?: ZoneTarget; crewId?: string; text: string }): StructuredReply {
  const reply = buildReply(intent, ctx, opts)
  // Voz (L7b): texto corrido com citações, passos guiados e o que foi consultado na base local.
  const n = narrate(reply, ctx, opts)
  return { ...reply, prose: n.prose, steps: n.steps, consulted: n.consulted, followUps: n.followUps }
}

/** Junta duas respostas: texto em sequência, passos e ações sem repetir, fontes somadas. */
function merge(a: StructuredReply, b: StructuredReply): StructuredReply {
  // "Como estou e o que faço?": o resumo do dia sem a frase final, depois os passos (sem repetir o dado).
  const pair = [a.intent, b.intent].sort().join('+')
  if (pair === 'status+whatNow') {
    const st = a.intent === 'status' ? a : b
    const wn = a.intent === 'status' ? b : a
    if (wn.steps?.length) {
      const prose = (st.prose ?? [st.summary]).slice(0, -1)
      return {
        ...st,
        id: `${st.id}+whatNow`,
        prose: [...prose, 'Here is what I would do, in order:'],
        steps: wn.steps,
        actions: wn.actions,
        consulted: [...(st.consulted ?? []), ...(wn.consulted ?? [])].filter((c, i, xs) => xs.findIndex((y) => y.id === c.id) === i),
        followUps: wn.followUps,
        escalate: st.escalate ?? wn.escalate,
      }
    }
  }
  const uniq = <T,>(xs: T[], key: (x: T) => string) => xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i)
  return {
    ...a,
    id: `${a.id}+${b.intent}`,
    prose: [...(a.prose ?? [a.summary]), ...(b.prose ?? [b.summary])],
    steps: a.steps?.length ? a.steps : b.steps,
    facts: uniq([...a.facts, ...b.facts], (f) => f.label),
    actions: uniq([...a.actions, ...b.actions], (x) => JSON.stringify(x)),
    consulted: uniq([...(a.consulted ?? []), ...(b.consulted ?? [])], (c) => c.id),
    followUps: uniq([...(b.followUps ?? []), ...(a.followUps ?? [])], (f) => f).slice(0, 3),
    escalate: a.escalate ?? b.escalate,
    illustrative: a.illustrative || b.illustrative,
  }
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
