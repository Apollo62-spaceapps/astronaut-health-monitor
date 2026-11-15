// System prompt e montagem do contexto para a LLM de bordo (AI-05). Texto em inglês (UI em inglês).
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import type { AssistantContext, VitalKind } from '@/domain/types'

export const VITAL_LABEL: Record<VitalKind, string> = {
  heartRate: 'resting heart rate',
  systolicBP: 'systolic blood pressure',
  diastolicBP: 'diastolic blood pressure',
  glucose: 'blood glucose',
  bodyTemp: 'body temperature',
}

/** Ações permitidas em alertas de vitais (CORE-09): só não clínicas. */
export const SAFE_ACTIONS = ['Re-measure', 'Notify the CMO', 'Follow the onboard medical checklist'] as const

export const AI_LABEL = 'AI-generated — verify with CMO/flight surgeon.'

export const SYSTEM_PROMPT = [
  'You are an onboard health assistant in a decision-support PROTOTYPE for astronauts. You are not a medical device.',
  'You may only: ask about symptoms, and summarize the data you are given.',
  'You must NOT diagnose, name diseases, prescribe or suggest medication or doses, or say anyone is "fit", "unfit" or "healthy".',
  'You must NOT contradict, downgrade or change any alert or status: they come from a deterministic rule engine.',
  'If any alert is "attention" or "urgent", tell the astronaut to notify the CMO or the flight surgeon.',
  'Allowed actions to suggest: Re-measure; Notify the CMO; Follow the onboard medical checklist. Nothing else clinical.',
  'Be brief (max 3 short sentences), calm and in plain English.',
].join(' ')

/** Contexto estruturado (montado pelas regras) que vai para a LLM. */
export function contextMessage(ctx: AssistantContext): string {
  const env = ENVIRONMENTS[ctx.missionMode]
  const eta = groundReplySec(ctx.missionMode)
  const lines = [
    `Environment: ${env.label}. Ground reply time: ${eta === 0 ? 'immediate' : `${Math.round(eta / 60) || eta} ${eta >= 60 ? 'min' : 's'}`}.`,
    'Vitals vs personal baseline: ' +
      ctx.vitalsSummary
        .map((v) => `${VITAL_LABEL[v.kind]} ${v.deviationPct > 0 ? '+' : ''}${v.deviationPct}% (${v.status})`)
        .join('; ') +
      '.',
    ctx.activeAlerts.length
      ? `Active alerts: ${ctx.activeAlerts.map((a) => `${a.level}: ${a.title}`).join('; ')}.`
      : 'No active alerts.',
    ctx.activeEvent
      ? `Active solar particle event (real NASA DONKI data, replayed): ${ctx.activeEvent.sepID}. Shelter procedure active.`
      : '',
  ]
  return lines.filter(Boolean).join('\n')
}
