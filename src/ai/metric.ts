// Perguntas sobre um valor (L8): "what's my blood pressure?", "how much did I sleep?", "what was my heart rate
// yesterday?", "average glucose this week". Responde só com o que está no contexto (motor de regras + histórico
// diário), com selo e sem limiar novo. Bem-estar só quando o perfil pode ver. Funções PURAS.
import type { OrbitContext } from '@/ai/context'
import { normalize } from '@/ai/intent'
import type { Fact } from '@/ai/schema'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { formatDeviation, type VitalEvaluation } from '@/domain/rules/vitals'
import type { SourceId, VitalKind } from '@/domain/types'
import { shownLevel } from '@/features/overview/phaseDisplay'
import { VITAL_LABEL, VITAL_UNIT, formatUtcTime, formatVitalValue } from '@/lib/format'

export type MetricKey = VitalKind | 'bloodPressure' | 'sleep' | 'mood' | 'dose' | 'exercise'
export type MetricWhen = 'latest' | 'yesterday' | 'week'
export interface MetricQuery {
  metric: MetricKey
  when: MetricWhen
}

const METRIC_RE: [MetricKey, RegExp][] = [
  ['systolicBP', /\bsystolic\b/],
  ['diastolicBP', /\bdiastolic\b/],
  ['bloodPressure', /\b(blood pressure|bp)\b/],
  ['heartRate', /\b(heart rate|pulse|bpm|heart)\b/],
  ['glucose', /\b(glucose|sugar)\b/],
  ['bodyTemp', /\b(temperature|temp)\b/],
  ['sleep', /\b(sleep|slept)\b/],
  ['mood', /\bmood\b/],
  ['dose', /\b(dose|radiation)\b/],
  ['exercise', /\b(exercise|workout|adherence|training)\b/],
]

/** Qual indicador e qual recorte de tempo a pergunta pede. null = não cita indicador. */
export function parseMetric(text: string): MetricQuery | null {
  const t = normalize(text)
  const metric = METRIC_RE.find(([, re]) => re.test(t))?.[0]
  if (!metric) return null
  const when: MetricWhen = /\byesterday\b/.test(t)
    ? 'yesterday'
    : /\b(average|week|last 7 days|history|trend|over time|lately|recently)\b/.test(t)
      ? 'week'
      : 'latest'
  return { metric, when }
}

const STATUS = { normal: 'Normal', attention: 'Attention', urgent: 'Urgent', adapting: 'Adapting', restricted: 'Restricted' }
const LOWER: Record<VitalKind, string> = {
  heartRate: 'resting heart rate',
  systolicBP: 'systolic blood pressure',
  diastolicBP: 'diastolic blood pressure',
  glucose: 'blood glucose',
  bodyTemp: 'body temperature',
}
const cite = (ids: SourceId[]) => ` [${ids.join(', ')}]`
const fmt = (k: VitalKind, v: number) => formatVitalValue(k, v)
const yesterdayOf = (iso: string) => new Date(Date.parse(iso.slice(0, 10)) - 86_400_000).toISOString().slice(0, 10)

function vitalFact(ctx: OrbitContext, ev: VitalEvaluation): Fact {
  return {
    label: VITAL_LABEL[ev.kind],
    value: fmt(ev.kind, ev.latest.value),
    unit: VITAL_UNIT[ev.kind],
    provenance: ev.latest.provenance.kind === 'real' ? 'REAL' : 'SIMULATED',
    status: shownLevel(ev.kind, ev.level, ctx.body),
    detail: `${formatDeviation(ev.deviationPct)} vs pre-flight · ${formatUtcTime(ev.latest.takenAt)}`,
  }
}

export interface MetricAnswer {
  prose: string[]
  facts: Fact[]
  followUps: string[]
  /** Indicador fora do normal (para propor "Re-measure"). */
  offVital?: VitalKind
}

function vitalAnswer(ctx: OrbitContext, kinds: VitalKind[], when: MetricWhen): MetricAnswer {
  const evs = kinds.map((k) => ctx.vitals.find((v) => v.kind === k)).filter((e): e is VitalEvaluation => !!e)
  if (!evs.length) return { prose: [`I have no ${kinds.map((k) => LOWER[k]).join(' or ')} readings yet.`], facts: [], followUps: [] }
  const today = ctx.simNowIso.slice(0, 10)
  const prose: string[] = []
  const bp = kinds.length === 2
  const label = bp ? 'blood pressure' : LOWER[evs[0]!.kind]
  if (when === 'latest') {
    if (bp) {
      const [s, d] = evs as [VitalEvaluation, VitalEvaluation]
      const worst = [s, d].sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))[0]!
      prose.push(
        `Your blood pressure is ${fmt('systolicBP', s.latest.value)}/${fmt('diastolicBP', d.latest.value)} mmHg, logged at ${formatUtcTime(s.latest.takenAt)}${s.latest.takenAt.slice(0, 10) === today ? ' today' : ''}. Against your pre-flight ${fmt('systolicBP', s.baseline.preflightMean)}/${fmt('diastolicBP', d.baseline.preflightMean)}, that is ${formatDeviation(s.deviationPct)} systolic and ${formatDeviation(d.deviationPct)} diastolic (${STATUS[shownLevel(worst.kind, worst.level, ctx.body)]}).`,
      )
    } else {
      const e = evs[0]!
      prose.push(
        `Your ${label} is ${fmt(e.kind, e.latest.value)} ${VITAL_UNIT[e.kind]}, logged at ${formatUtcTime(e.latest.takenAt)}${e.latest.takenAt.slice(0, 10) === today ? ' today' : ` on ${e.latest.takenAt.slice(0, 10)}`}: ${formatDeviation(e.deviationPct)} against your pre-flight average of ${fmt(e.kind, e.baseline.preflightMean)} ${VITAL_UNIT[e.kind]} (${STATUS[shownLevel(e.kind, e.level, ctx.body)]}).`,
      )
    }
  } else if (when === 'yesterday') {
    const y = yesterdayOf(ctx.simNowIso)
    const parts = evs.map((e) => ({ e, v: ctx.history[e.kind]?.find((h) => h.day === y)?.value }))
    if (parts.some((p) => p.v === undefined)) prose.push(`I have no ${label} reading from yesterday (${y}).`)
    else
      prose.push(
        bp
          ? `Yesterday your blood pressure read ${fmt('systolicBP', parts[0]!.v!)}/${fmt('diastolicBP', parts[1]!.v!)} mmHg; today it is ${fmt('systolicBP', evs[0]!.latest.value)}/${fmt('diastolicBP', evs[1]!.latest.value)}.`
          : `Yesterday your ${label} read ${fmt(evs[0]!.kind, parts[0]!.v!)} ${VITAL_UNIT[evs[0]!.kind]}; the latest reading is ${fmt(evs[0]!.kind, evs[0]!.latest.value)}.`,
      )
  } else {
    for (const e of evs) {
      const days = (ctx.history[e.kind] ?? []).slice(-7)
      if (days.length < 2) {
        prose.push(`There are not enough ${LOWER[e.kind]} readings this week to summarize.`)
        continue
      }
      const values = days.map((d) => d.value)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      prose.push(
        `Over the last ${days.length} days your ${LOWER[e.kind]} averaged ${fmt(e.kind, avg)} ${VITAL_UNIT[e.kind]}, ranging from ${fmt(e.kind, Math.min(...values))} to ${fmt(e.kind, Math.max(...values))}: ${values.map((v) => fmt(e.kind, v)).join(' → ')}.`,
      )
    }
  }
  const trend = ctx.trends.find((t) => kinds.includes(t.kind))
  if (trend)
    prose.push(
      `It has been moving ${trend.direction} for ${trend.days} days in a row. That is a preventive trend, not an alarm.`,
    )
  const off = evs.find((e) => e.level !== 'normal')
  if (off) prose.push('Want me to walk you through what to do next?')
  return {
    prose,
    facts: evs.map((e) => vitalFact(ctx, e)),
    followUps: [
      ...(off ? ['What should I do now?'] : []),
      when === 'week' ? `What was my ${bp ? 'blood pressure' : LOWER[evs[0]!.kind]} yesterday?` : `What is my average ${bp ? 'blood pressure' : LOWER[evs[0]!.kind]} this week?`,
      'Am I drifting from my baseline?',
    ].slice(0, 3),
    offVital: off?.kind,
  }
}

function wellbeingAnswer(ctx: OrbitContext, metric: 'sleep' | 'mood', when: MetricWhen): MetricAnswer {
  if (!ctx.wellbeing)
    return {
      prose: ['Mood and sleep are private to the astronaut, so they are not in my context for this profile. I will not guess.'],
      facts: [],
      followUps: ['What can you see?'],
    }
  const entries = [...ctx.wellbeing].filter((w) => w.date <= ctx.simNowIso.slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date))
  if (!entries.length) return { prose: ['There is no check-in yet.'], facts: [], followUps: [] }
  const last = entries.at(-1)!
  const week = entries.slice(-7)
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const prose =
    metric === 'sleep'
      ? when === 'week'
        ? [`Over your last ${week.length} check-ins you slept ${avg(week.map((w) => w.sleepHours)).toFixed(1)} h on average, from ${Math.min(...week.map((w) => w.sleepHours))} to ${Math.max(...week.map((w) => w.sleepHours))} h.`]
        : [`In your last check-in (${last.date}) you logged ${last.sleepHours} h of sleep.`]
      : when === 'week'
        ? [`Your mood averaged ${avg(week.map((w) => w.mood)).toFixed(1)} of 5 over your last ${week.length} check-ins.`]
        : [`In your last check-in (${last.date}) you rated your mood ${last.mood} of 5.`]
  prose.push(
    `That is self-report, private to you. NASA links sleep and mood to isolation and confinement on long missions.${cite(['S19'])}`,
  )
  return {
    prose,
    facts: [
      metric === 'sleep'
        ? { label: 'Sleep', value: String(last.sleepHours), unit: 'h', provenance: 'SIMULATED', detail: last.date }
        : { label: 'Mood (self-report)', value: String(last.mood), unit: 'of 5', provenance: 'SIMULATED', detail: last.date },
    ],
    followUps: [metric === 'sleep' ? 'How is my mood?' : 'How much did I sleep?', 'How am I doing today?'],
  }
}

function doseAnswer(ctx: OrbitContext): MetricAnswer {
  const d = ctx.radiation
  const env = ENVIRONMENTS[ctx.environment]
  if (d.pctOfLimit === null)
    return {
      prose: [
        `Your prior career dose is ${Math.round(d.priorMSv)} mSv. ${ctx.environment === 'EARTH' ? 'On Earth' : `On the ${env.label}`} there is no sourced daily rate, so I am not adding a mission dose. The career limit is 600 mSv.${cite(['S03'])}`,
      ],
      facts: [{ label: 'Career dose (prior)', value: String(Math.round(d.priorMSv)), unit: 'mSv', provenance: 'SIMULATED' }],
      followUps: ['What do I do about the solar event?'],
    }
  return {
    prose: [
      `Your career dose is about ${Math.round(d.totalMSv!)} mSv, ${Math.round(d.pctOfLimit)}% of the 600 mSv limit.${cite(['S03'])} Aboard the Spacecraft it grows by about ${d.rateMSvPerDay} mSv a day, the cruise average measured on the way to Mars.${cite(['S08', 'S09'])}`,
      ctx.shelterActive ? 'A solar particle event is active right now, so shelter comes first.' : 'No solar particle event is active right now.',
    ],
    facts: [
      { label: 'Career dose', value: String(Math.round(d.pctOfLimit)), unit: '% of 600 mSv', provenance: 'SIMULATED', sourceId: 'S09', detail: `${Math.round(d.totalMSv!)} mSv` },
    ],
    followUps: ['What do I do about the solar event?', 'What changes on the Moon?'],
  }
}

function exerciseAnswer(ctx: OrbitContext): MetricAnswer {
  const a = ctx.exercise.adherencePct
  return {
    prose: [
      a === null
        ? 'There is no exercise plan logged this week.'
        : `This week you completed ${Math.round(a)}% of the logged plan, with a ${ctx.exercise.streakDays}-day streak${ctx.exercise.postponed ? `; ${ctx.exercise.postponed} session${ctx.exercise.postponed === 1 ? ' is' : 's are'} postponed today because of the shelter` : ''}.`,
      `Exercise is the daily countermeasure against bone and muscle loss in microgravity.${cite(['S19'])}`,
    ],
    facts:
      a === null
        ? []
        : [{ label: 'Exercise adherence', value: String(Math.round(a)), unit: '%', provenance: 'SIMULATED', detail: `last 7 days · ${ctx.exercise.streakDays}-day streak` }],
    followUps: ['How do astronauts exercise on the station?'],
  }
}

/** Resposta para uma pergunta de valor. Sem indicador reconhecido, cai no resumo do dia (status). */
export function metricAnswer(ctx: OrbitContext, q: MetricQuery): MetricAnswer {
  switch (q.metric) {
    case 'bloodPressure':
      return vitalAnswer(ctx, ['systolicBP', 'diastolicBP'], q.when)
    case 'sleep':
    case 'mood':
      return wellbeingAnswer(ctx, q.metric, q.when)
    case 'dose':
      return doseAnswer(ctx)
    case 'exercise':
      return exerciseAnswer(ctx)
    default:
      return vitalAnswer(ctx, [q.metric], q.when)
  }
}
