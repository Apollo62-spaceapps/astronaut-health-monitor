// Triagem guiada do Orbit (L7 §6). Máquina de estados PURA. Sem diagnóstico, sem causa provável, sem gravidade
// clínica e sem lista de sintomas sem fonte (P-05): só perguntas genéricas. Dor no peito, falta de ar ou
// desmaio ⇒ resposta imediata (BODY-10/P-12): "This needs a person now."
import type { OrbitContext } from '@/ai/context'
import { EMERGENCY_TEXT, TRIAGE_DISCLAIMER } from '@/ai/identity'
import { isEmergency } from '@/ai/intent'
import { etaText, vitalFact } from '@/ai/reply'
import type { Fact, ReplyAction, StructuredReply } from '@/ai/schema'
import { ALERT_LEVEL_ORDER } from '@/domain/rules/vitals'

export type TriageStep = 'what' | 'when' | 'worse' | 'tasks' | 'remeasured' | 'done' | 'emergency'

export interface TriageAnswers {
  /** Relato em palavras da pessoa. */
  what?: string
  areas?: string[]
  when?: string
  worse?: 'yes' | 'no' | 'not sure'
  /** "Does it stop you from doing your tasks?" */
  stopsTasks?: boolean
  remeasured?: 'yes' | 'no'
}

export interface TriageState {
  step: TriageStep
  answers: TriageAnswers
}

export const TRIAGE_AREAS = ['Heart', 'Breathing', 'Head', 'Skin', 'Energy', 'Sleep', 'Mood', 'Other'] as const

export const TRIAGE_QUESTIONS: Record<
  Exclude<TriageStep, 'done' | 'emergency'>,
  { question: string; options: string[] }
> = {
  what: { question: 'What are you noticing?', options: [...TRIAGE_AREAS] },
  when: { question: 'When did it start?', options: ['Just now', 'Earlier today', 'A few days ago', 'Longer'] },
  worse: { question: 'Is it getting worse?', options: ['Yes', 'No', 'Not sure'] },
  tasks: { question: 'Does it stop you from doing your tasks?', options: ['Yes', 'No'] },
  remeasured: { question: 'Have you re-measured your vitals?', options: ['Yes', 'No'] },
}

const NEXT: Record<Exclude<TriageStep, 'done' | 'emergency'>, TriageStep> = {
  what: 'when',
  when: 'worse',
  worse: 'tasks',
  tasks: 'remeasured',
  remeasured: 'done',
}

/** Começa a triagem. Texto inicial com sinal de emergência pula direto para a resposta imediata. */
export function startTriage(initialText?: string): TriageState {
  const text = initialText?.trim()
  if (text && isEmergency(text)) return { step: 'emergency', answers: { what: text } }
  // Um relato já dado ("I feel dizzy") vale como resposta da primeira pergunta.
  if (text && text.split(/\s+/).length >= 2) return { step: 'when', answers: { what: text } }
  return { step: 'what', answers: {} }
}

/** Avança um passo. Qualquer resposta com sinal de emergência leva à resposta imediata. */
export function answerTriage(state: TriageState, answer: string): TriageState {
  if (state.step === 'done' || state.step === 'emergency') return state
  if (isEmergency(answer))
    return { step: 'emergency', answers: { ...state.answers, what: state.answers.what ?? answer } }
  const a = { ...state.answers }
  const v = answer.trim()
  switch (state.step) {
    case 'what':
      if ((TRIAGE_AREAS as readonly string[]).includes(v)) a.areas = [...(a.areas ?? []), v]
      else a.what = v
      break
    case 'when':
      a.when = v
      break
    case 'worse':
      a.worse = v.toLowerCase() === 'yes' ? 'yes' : v.toLowerCase() === 'no' ? 'no' : 'not sure'
      break
    case 'tasks':
      a.stopsTasks = v.toLowerCase() === 'yes'
      break
    case 'remeasured':
      a.remeasured = v.toLowerCase() === 'yes' ? 'yes' : 'no'
      break
  }
  return { step: NEXT[state.step], answers: a }
}

/** Relato em palavras da pessoa, para o resumo e o pacote. */
export function reportText(a: TriageAnswers): string {
  const what = [a.what, a.areas?.length ? `area: ${a.areas.join(', ').toLowerCase()}` : undefined]
    .filter(Boolean)
    .join('; ')
  return [
    what || 'something new',
    a.when ? `started ${a.when.toLowerCase()}` : undefined,
    a.worse ? `getting worse: ${a.worse}` : undefined,
    a.stopsTasks === undefined ? undefined : a.stopsTasks ? 'it stops tasks' : 'tasks still possible',
    a.remeasured ? `re-measured: ${a.remeasured}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Resposta da triagem (fim do fluxo ou emergência). Escala por "worse", "stops tasks" ou alerta do motor. */
export function triageReply(state: TriageState, ctx: OrbitContext): StructuredReply {
  const id = `triage:${ctx.simNowIso}`
  const eta = etaText(ctx)
  if (state.step === 'emergency')
    return {
      id,
      intent: 'triage',
      summary: EMERGENCY_TEXT,
      facts: [],
      actions: [{ kind: 'notifyCmo' }, { kind: 'openChecklist' }],
      escalate: { level: 'recommended', reason: 'Crew report needs a person now.', etaText: eta },
      note: TRIAGE_DISCLAIMER,
      report: state.answers.what,
      engine: 'protocol',
    }
  const a = state.answers
  const engineAlert = ctx.worstLevel !== 'normal' || ctx.shelterActive
  const recommend = a.worse === 'yes' || a.stopsTasks === true || engineAlert
  const off = ctx.vitals
    .filter((v) => v.level !== 'normal')
    .sort((x, y) => ALERT_LEVEL_ORDER.indexOf(y.level) - ALERT_LEVEL_ORDER.indexOf(x.level))
  const facts: Fact[] = off.map((v) => vitalFact(ctx, v))
  const actions: ReplyAction[] = []
  if (a.remeasured !== 'yes') actions.push({ kind: 'remeasure', vital: off[0]?.kind ?? 'heartRate' })
  actions.push({ kind: 'notifyCmo' }, { kind: 'openChecklist' })
  return {
    id,
    intent: 'triage',
    summary: `You reported: ${reportText(a)}. ${recommend ? 'Notify the CMO with this report.' : 'Re-measure, keep watching it, and notify the CMO if it changes.'}`,
    facts,
    actions,
    escalate: recommend
      ? {
          level: 'recommended',
          reason:
            a.worse === 'yes'
              ? 'It is getting worse.'
              : a.stopsTasks
                ? 'It stops you from doing your tasks.'
                : 'The rule engine already has an active alert.',
          etaText: eta,
        }
      : { level: 'consider', reason: 'New symptom reported.', etaText: eta },
    limits: ctx.shelterActive ? ['A solar particle event is active: follow the shelter procedure first.'] : [],
    note: TRIAGE_DISCLAIMER,
    illustrative: facts.length > 0,
    report: reportText(a),
    engine: 'protocol',
  }
}
