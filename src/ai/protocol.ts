// ProtocolEngine (AI-01): árvore de perguntas e templates DETERMINÍSTICOS, preenchidos com o contexto.
// Funciona 100% sozinho (sem LLM, sem rede). Nunca diagnostica, nunca prescreve, nunca muda alertas.
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import type { AssistantContext, AssistantEngine, ChatMessage } from '@/domain/types'
import { SAFE_ACTIONS, VITAL_LABEL } from '@/ai/prompts'

/** Checagem genérica após o evento de radiação (AI-08: lista de sintomas sem fonte, P-05). */
export const GENERIC_CHECK = 'How are you feeling? Any new symptoms?'

function etaSentence(ctx: AssistantContext): string {
  const eta = groundReplySec(ctx.missionMode)
  const env = ENVIRONMENTS[ctx.missionMode]
  if (eta === 0) return `You are in ${env.label} mode: the flight surgeon is available now.`
  const when = eta >= 60 ? `about ${Math.round(eta / 60)} minutes` : `about ${eta.toFixed(1)} seconds`
  return `You are in ${env.label} mode: a ground reply would take ${when}, so follow the safe actions now.`
}

function vitalsSentence(ctx: AssistantContext): string {
  const off = ctx.vitalsSummary.filter((v) => v.status !== 'normal')
  if (off.length === 0) return 'Your vitals are within your own baseline today.'
  return off
    .map(
      (v) =>
        `Your ${VITAL_LABEL[v.kind]} is ${Math.abs(v.deviationPct)}% ${v.deviationPct >= 0 ? 'above' : 'below'} your own baseline (${v.status}).`,
    )
    .join(' ')
}

/** Sugestões de perguntas para a tela (chips), conforme o cenário. */
export function suggestions(ctx: AssistantContext): string[] {
  const s = ['Summarize today’s readings', 'Explain my status labels', 'How do I log a measurement?']
  if (ctx.activeEvent) s.unshift('What do I do about the solar event?')
  s.push('How is my exercise tracking going?')
  return s
}

export function protocolReply(ctx: AssistantContext, userText: string): string {
  const t = userText.toLowerCase()
  const actions = `Safe actions: ${SAFE_ACTIONS.join(' · ')}.`
  const anyOff =
    ctx.vitalsSummary.some((v) => v.status !== 'normal') || ctx.activeAlerts.some((a) => a.level !== 'normal')

  if (ctx.activeEvent && /solar|radiation|shelter|event|dose|flare/.test(t)) {
    return [
      'A solar particle event is active (real NASA DONKI event, replayed in this scenario).',
      'Follow the shelter procedure on the Radiation screen (adapted from the NASA Orion procedure).',
      GENERIC_CHECK,
    ].join(' ')
  }
  if (/exercise|workout|training|minutes|streak/.test(t)) {
    return 'Exercise entries are self-reported. The Exercise screen summarizes logged minutes and recent consistency; its ISS reference is context, not an individual target. The monitor does not prescribe or change a training plan.'
  }
  if (/status|normal|attention|urgent|restricted|adapting/.test(t)) {
    return 'Normal means the reading is within its configured comparison range. Attention means a rule detected a deviation; Urgent means an urgent rule is active. Restricted marks private or unavailable information, and Adapting marks a recent environment-change window. Thresholds are illustrative; consult your flight surgeon.'
  }
  if (/sleep|mood|wellbeing|well-being|check.?in/.test(t)) {
    return 'The Wellbeing check-in records your self-reported mood and sleep for the selected environment. Entries are private and are not a clinical assessment. You can review the recent trend on the Wellbeing screen.'
  }
  if (/source|article|reference|nasa/.test(t)) {
    return 'Open Data & Sources to review the references behind this prototype. The Exercise screen links to NASA material about ISS exercise; these references provide context and do not validate individual targets.'
  }
  if (/radiation|dose/.test(t)) {
    return ctx.activeEvent
      ? 'The demo event is replayed from NASA DONKI. The Radiation screen shows its source and the scenario shelter procedure. This is not a live space-weather alert; follow the displayed procedure and consult your flight surgeon.'
      : 'The Radiation screen shows the scenario’s career-dose estimate and source notes. Some values are simulated, and a rate without a source is not added.'
  }
  if (/ground|reply|delay|earth|houston|surgeon|how long/.test(t)) return etaSentence(ctx)
  if (/measure|remind|routine|check-in|checkin/.test(t)) {
    return 'Use Log measurement on the Overview when it is available, or open Vitals to review recorded readings. Check-in values are self-reported and labeled by environment.'
  }
  if (/do now|what should|help|what do i do/.test(t)) {
    return anyOff
      ? `${vitalsSentence(ctx)} ${actions} ${etaSentence(ctx)}`
      : `${vitalsSentence(ctx)} Keep following your mission routine. ${GENERIC_CHECK}`
  }
  if (/how am i|doing|status|today|feel/.test(t)) {
    return `${vitalsSentence(ctx)}${anyOff ? ` ${actions}` : ''} ${GENERIC_CHECK}`
  }
  return `I can summarize your data and guide you to safe actions. Try: ${suggestions(ctx)
    .map((q) => `“${q}”`)
    .join(', ')}.`
}

export class ProtocolEngine implements AssistantEngine {
  readonly mode = 'protocol' as const
  async init() {}
  async reply(ctx: AssistantContext, _history: ChatMessage[], userText: string) {
    return protocolReply(ctx, userText)
  }
}
