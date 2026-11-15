// Voz do Orbit (L7b): transforma a resposta estruturada (reply.ts) em texto corrido, como um assistente que
// conversa, não um formulário. Continua DETERMINÍSTICO (mesma pergunta + mesmo dado ⇒ mesmo texto): a variedade
// vem de escolher a frase de abertura pela própria pergunta. Só usa números do contexto e passagens da base
// local (knowledge.ts) com a fonte citada no texto ([Sxx]). Nunca "fit/healthy/fine", nunca diagnóstico.
import type { OrbitContext } from '@/ai/context'
import { ASSISTANT_NAME } from '@/ai/identity'
import { KNOWLEDGE, passageById, retrieve, type Passage } from '@/ai/knowledge'
import { RISK_TEXT } from '@/ai/reply'
import { environmentIn, normalize } from '@/ai/intent'
import { metricAnswer, parseMetric } from '@/ai/metric'
import { referenceTransition } from '@/domain/rules/reference'
import type { StructuredReply, ZoneTarget } from '@/ai/schema'
import { BODY_ZONES, HAZARD_LABEL } from '@/domain/config/bodyZones'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { VITAL_DEVIATION_PCT } from '@/domain/config/thresholds'
import { SHELTER_STEPS } from '@/domain/rules/radiation'
import { ALERT_LEVEL_ORDER, type VitalEvaluation } from '@/domain/rules/vitals'
import type { MissionMode, SourceId, ZoneStatus } from '@/domain/types'
import { shownLevel, zoneOfVital } from '@/features/overview/phaseDisplay'
import { ZONE_CONTENT } from '@/features/overview/zoneContent'
import { VITAL_UNIT, formatShortDuration, formatUtcTime, formatVitalValue } from '@/lib/format'

export interface Narration {
  /** Parágrafos com citações inline ("[S19]"). */
  prose: string[]
  /** Passos guiados em linguagem simples (autoatendimento seguro). */
  steps?: { text: string; sourceIds?: SourceId[] }[]
  /** Passagens da base local usadas na resposta (transparência da RAG). */
  consulted?: { id: string; title: string; sourceIds: SourceId[] }[]
  /** Próximas perguntas sugeridas. */
  followUps?: string[]
}

// ───────────────────────── helpers de linguagem ─────────────────────────

const PLACE: Record<MissionMode, string> = {
  EARTH: 'on Earth',
  ISS: 'on the Space Station',
  LUNAR: 'on the Moon',
  SPACECRAFT: 'aboard the Spacecraft',
}
const LOWER_LABEL: Record<string, string> = {
  heartRate: 'resting heart rate',
  systolicBP: 'systolic blood pressure',
  diastolicBP: 'diastolic blood pressure',
  glucose: 'blood glucose',
  bodyTemp: 'body temperature',
}
const STATUS_WORD = {
  normal: 'Normal',
  attention: 'Attention',
  urgent: 'Urgent',
  adapting: 'Adapting',
  restricted: 'Restricted',
}

/** Escolha determinística: a mesma pergunta sempre gera a mesma frase. */
function pick<T>(options: readonly T[], seed: string): T {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return options[h % options.length]!
}
export const cite = (ids: readonly SourceId[] | undefined) => (ids && ids.length ? ` [${ids.join(', ')}]` : '')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** "Distance from Earth" → "distance from Earth" (nome próprio continua maiúsculo). */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const value = (ev: VitalEvaluation) => `${formatVitalValue(ev.kind, ev.latest.value)} ${VITAL_UNIT[ev.kind]}`
const base = (ev: VitalEvaluation) => `${formatVitalValue(ev.kind, ev.baseline.preflightMean)} ${VITAL_UNIT[ev.kind]}`
const pctText = (dev: number) => `${Math.round(Math.abs(dev))}%`
const rank = (l: VitalEvaluation['level']) => ALERT_LEVEL_ORDER.indexOf(l)

function worst(ctx: OrbitContext): VitalEvaluation | undefined {
  return [...ctx.vitals].sort(
    (a, b) => rank(b.level) - rank(a.level) || Math.abs(b.deviationPct) - Math.abs(a.deviationPct),
  )[0]
}

/** "a reply from the ground would take about 40 minutes" etc. */
export function groundPhrase(ctx: OrbitContext): string {
  if (ctx.environment === 'EARTH') return 'the flight surgeon is available right now'
  if (ctx.groundReplySec === 0) return 'the ground answers almost in real time'
  const t =
    ctx.groundReplySec >= 60
      ? `about ${Math.round(ctx.groundReplySec / 60)} minutes`
      : `about ${formatShortDuration(ctx.groundReplySec)}`
  return `a reply from the ground would take ${t}`
}

const consult = (...ids: string[]) =>
  ids
    .map((id) => passageById(id))
    .filter((p): p is Passage => !!p)
    .map((p) => ({ id: p.id, title: p.title, sourceIds: p.sourceIds }))

/** Frase do desvio com a referência e o horário: "84 bpm at 07:30, about 18% above your pre-flight average of 71 bpm". */
function deviationClause(ctx: OrbitContext, ev: VitalEvaluation): string {
  const dir = ev.deviationPct >= 0 ? 'above' : 'below'
  const whose = ctx.role === 'ASTRONAUT' ? 'your' : 'the'
  return `${value(ev)} at ${formatUtcTime(ev.latest.takenAt).replace(' UTC', '')}, about ${pctText(ev.deviationPct)} ${dir} ${whose} pre-flight average of ${base(ev)}`
}

const nextSteps = (ctx: OrbitContext, kind?: VitalEvaluation['kind']): NonNullable<Narration['steps']> => [
  ...(kind && ctx.role === 'ASTRONAUT'
    ? [{ text: `Re-measure your ${LOWER_LABEL[kind]} now (Log measurement), so we know whether the reading holds.` }]
    : []),
  {
    text:
      ctx.environment === 'EARTH'
        ? 'If it is still outside your reference, talk to the flight surgeon: they are available now. I can draft the note with your numbers.'
        : 'If it is still outside your reference, notify the CMO. I will draft the message with your numbers; nothing is sent until you confirm.',
  },
  { text: 'Follow the onboard medical checklist that flies with the crew.', sourceIds: ['S04'] },
  ...(ctx.groundReplySec >= 60
    ? [{ text: `Do not wait for Earth: ${groundPhrase(ctx)}, so these steps are yours to take now.` }]
    : []),
]

// ───────────────────────── por intenção ─────────────────────────

function status(ctx: OrbitContext, seed: string): Narration {
  const off = ctx.vitals.filter((v) => v.level !== 'normal').sort((a, b) => rank(b.level) - rank(a.level))
  const opener = pick(
    [
      'Here is how today looks.',
      'I went through everything logged so far today.',
      'Quick read of your numbers for today.',
    ],
    seed,
  )
  const prose: string[] = []
  const trend = ctx.trends.find((t) => t.kind === off[0]?.kind) ?? ctx.trends[0]
  if (off.length === 0) {
    prose.push(
      `${opener} Heart rate, blood pressure, glucose and temperature all sit within your personal reference ${PLACE[ctx.environment]}, compared with your own pre-flight exam rather than a population range.`,
    )
  } else {
    const top = off[0]!
    const shown = shownLevel(top.kind, top.level, ctx.body)
    prose.push(
      `${opener} Most readings sit within your personal reference, with ${off.length === 1 ? 'one exception' : `${off.length} exceptions`}: your ${LOWER_LABEL[top.kind]} came in at ${deviationClause(ctx, top)}. That crosses the illustrative ${STATUS_WORD[shown]} line${shown === 'adapting' ? ', shown as Adapting while you settle into the new gravity' : ''}.`,
    )
    if (off.length > 1)
      prose.push(
        `Also outside the reference: ${off
          .slice(1)
          .map(
            (v) =>
              `${LOWER_LABEL[v.kind]} (${value(v)}, ${pctText(v.deviationPct)} ${v.deviationPct >= 0 ? 'above' : 'below'})`,
          )
          .join(', ')}.`,
      )
  }
  if (trend)
    prose.push(
      `${cap(LOWER_LABEL[trend.kind]!)} has also been moving ${trend.direction} for ${trend.days} days in a row, roughly ${Math.abs(Math.round(trend.slopePerDay * 10) / 10)} ${VITAL_UNIT[trend.kind]} a day. That slow drift is exactly what I watch for before anything turns red.`,
    )
  const extras: string[] = []
  if (ctx.radiation.pctOfLimit !== null)
    extras.push(
      `career radiation dose is at ${Math.round(ctx.radiation.pctOfLimit)}% of the 600 mSv limit${cite(['S03'])}`,
    )
  if (ctx.exercise.adherencePct !== null)
    extras.push(
      `exercise adherence is ${Math.round(ctx.exercise.adherencePct)}% this week with a ${ctx.exercise.streakDays}-day streak`,
    )
  const due = ctx.routine.filter((r) => r.status === 'due' || r.status === 'overdue').length
  if (due) extras.push(`${due} routine item${due === 1 ? ' is' : 's are'} still due`)
  if (extras.length) prose.push(`${cap(extras.join('; '))}.`)
  if (off.length)
    prose.push(
      `${cap(groundPhrase(ctx))}, so the next move is yours: re-measure, and if it holds, let the CMO know. I can draft that message for you.`,
    )
  else prose.push('Nothing needs action right now. Keep following your mission routine.')
  return {
    prose,
    consulted: consult(
      'personal-reference',
      ...(off[0] && zoneOfVital(off[0].kind) === 'heart' ? ['heart-gravity'] : []),
    ),
    followUps: off.length
      ? [
          `Why is my ${zoneOfVital(off[0]!.kind) ?? 'heart'} zone ${STATUS_WORD[shownLevel(off[0]!.kind, off[0]!.level, ctx.body)].toLowerCase()}?`,
          'What should I do now?',
          'Prepare a message for the CMO',
        ]
      : ['Am I drifting from my baseline?', 'Who is at higher risk?', 'What is my baseline?'],
  }
}

function whatNow(ctx: OrbitContext, seed: string): Narration {
  if (ctx.shelterActive) return solarEvent(ctx, seed)
  const top = worst(ctx)
  if (top && top.level !== 'normal') {
    return {
      prose: [
        `${pick(['Here is what I would do, in order.', 'Let’s take this one step at a time.', 'Short version: re-measure first, then loop in the CMO.'], seed)} Your ${LOWER_LABEL[top.kind]} is ${deviationClause(ctx, top)}. One reading is not a verdict, so the first step is to check whether it holds.`,
        `${cap(groundPhrase(ctx))}.${ctx.groundReplySec >= 60 ? ' The steps below do not depend on Earth.' : ''}`,
      ],
      steps: nextSteps(ctx, top.kind),
      consulted: consult('flight-surgeon', zoneOfVital(top.kind) === 'heart' ? 'heart-gravity' : 'personal-reference'),
      followUps: [
        `Why is my ${zoneOfVital(top.kind) ?? 'heart'} zone ${STATUS_WORD[shownLevel(top.kind, top.level, ctx.body)].toLowerCase()}?`,
        'Prepare a message for the CMO',
        'Prepare the ground report',
      ],
    }
  }
  const trend = ctx.trends[0]
  if (trend)
    return {
      prose: [
        `Nothing is outside your reference right now. The one thing I would keep an eye on: ${LOWER_LABEL[trend.kind]} has been moving ${trend.direction} for ${trend.days} days in a row. It is a preventive notice, never an alarm.`,
        'A fresh measurement today helps tell a trend from noise.',
      ],
      steps:
        ctx.role === 'ASTRONAUT'
          ? [{ text: `Re-measure your ${LOWER_LABEL[trend.kind]} today (Log measurement).` }]
          : undefined,
      consulted: consult('personal-reference'),
      followUps: ['Am I drifting from my baseline?', 'How am I doing today?'],
    }
  const due = ctx.routine.find((r) => r.kind === 'measure' && (r.status === 'due' || r.status === 'overdue'))
  return {
    prose: [
      due
        ? `Nothing needs attention. The only open item is “${due.title}”, which is ${due.status}. Log it when you have a minute.`
        : 'Nothing needs action now. Everything is within your personal reference; keep following your mission routine.',
    ],
    followUps: ['How am I doing today?', 'What’s due?'],
  }
}

function zoneExplain(ctx: OrbitContext, zoneId: ZoneTarget | undefined, seed: string): Narration {
  const target: ZoneTarget = zoneId ?? (worst(ctx) ? (zoneOfVital(worst(ctx)!.kind) ?? 'heart') : 'heart')
  if (target === 'radiation') return solarEvent(ctx, seed)
  const zone = BODY_ZONES.find((z) => z.id === target)!
  const st = ctx.body[zone.id]
  if (st === 'restricted')
    return {
      prose: [`${zone.label} holds private medical data for this profile, so I cannot see it and will not guess.`],
    }
  const evs = ctx.vitals.filter((v) => (zone.indicators as string[]).includes(v.kind))
  const top = [...evs].sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))[0]
  const content = ZONE_CONTENT[zone.id]
  const prose: string[] = []
  if (!st) prose.push(`I have no readings for ${zone.label.toLowerCase()} yet, so there is nothing to compare.`)
  else if (top && (st === 'attention' || st === 'urgent' || st === 'adapting')) {
    const t = VITAL_DEVIATION_PCT[top.kind]
    prose.push(
      `${zone.label} shows ${STATUS_WORD[st]} because your ${LOWER_LABEL[top.kind]} is ${deviationClause(ctx, top)}. In this prototype Attention starts at ${t.attention}% away from your own reference and Urgent at ${t.urgent}%; those lines are illustrative until the team sources them.`,
    )
    if (st === 'adapting')
      prose.push(
        `You changed gravity field recently, so for a few days I show it as Adapting instead of Attention. Urgent is never hidden this way.${cite(['S19', 'S04'])}`,
      )
    const others = evs.filter((v) => v !== top)
    if (others.length)
      prose.push(
        `The other ${zone.label.toLowerCase()} indicators look steady: ${others.map((v) => `${LOWER_LABEL[v.kind]} ${value(v)}`).join(', ')}.`,
      )
  } else if (st) {
    prose.push(
      `${zone.label} is ${STATUS_WORD[st]}: ${evs.length ? evs.map((v) => `${LOWER_LABEL[v.kind]} ${value(v)}`).join(', ') : 'the readings'} sit within your personal reference.`,
    )
  }
  prose.push(
    content.whyItMatters
      ? `Why it matters: ${content.whyItMatters.text}${cite(content.whyItMatters.sourceIds)} The related hazard is ${zone.hazard ? lowerFirst(HAZARD_LABEL[zone.hazard]) : 'still under review'}.`
      : `I have no source that links this zone to a hazard yet, so I will not speculate. Consult your flight surgeon.`,
  )
  const passages =
    zone.id === 'heart'
      ? ['heart-gravity']
      : zone.id === 'legs' || zone.id === 'arms'
        ? ['bone-muscle']
        : zone.id === 'head'
          ? ['sleep-behavior']
          : zone.id === 'skin'
            ? ['immune']
            : []
  return {
    prose,
    steps: st === 'attention' || st === 'urgent' || st === 'adapting' ? nextSteps(ctx, top?.kind) : undefined,
    consulted: consult(...passages, 'personal-reference'),
    followUps: ['What should I do now?', 'Am I drifting from my baseline?', 'Where did my reference come from?'],
  }
}

function solarEvent(ctx: OrbitContext, seed: string): Narration {
  if (!ctx.shelterActive || !ctx.event)
    return {
      prose: [
        `No solar particle event is active right now.${
          ctx.radiation.pctOfLimit === null
            ? ` ${cap(PLACE[ctx.environment])} there is no sourced daily dose rate, so I am not adding a mission dose number.`
            : ` Your career dose is at ${Math.round(ctx.radiation.pctOfLimit)}% of the 600 mSv limit${cite(['S03'])}.`
        }`,
        `If one starts, I will walk you through the shelter procedure step by step.${cite(['S05'])}`,
      ],
      consulted: consult('radiation-limit', 'shelter'),
      followUps: ['How long until the ground replies?', 'How am I doing today?'],
    }
  return {
    prose: [
      `${pick(['This one is real and it is the priority.', 'Shelter first, everything else after.', 'A solar particle event is active, so let’s get you protected.'], seed)} The event in this scenario was observed near Earth on 11 May 2024 and recorded in NASA’s DONKI database; it is replayed here.${cite(['S07'])}`,
      `The shelter flow is adapted from NASA’s Orion procedure. You have up to an hour to prepare, and staying sheltered can take up to 24 hours.${cite(['S05'])} Today’s exercise is postponed while you shelter${ctx.exercise.postponed ? ` (${ctx.exercise.postponed} session${ctx.exercise.postponed === 1 ? '' : 's'})` : ''}.`,
      `Once you are settled, tell me how you feel: any new symptoms?`,
    ],
    steps: [
      ...SHELTER_STEPS.map((s) => ({ text: s, sourceIds: ['S05'] as SourceId[] })),
      { text: `Notify the CMO; ${groundPhrase(ctx)}.` },
    ],
    consulted: consult('shelter', 'donki', 'radiation-limit'),
    followUps: ['I feel dizzy', 'Prepare a message for the CMO', 'How long until the ground replies?'],
  }
}

function groundDelay(ctx: OrbitContext): Narration {
  const env = ENVIRONMENTS[ctx.environment]
  const prose: string[] = []
  if (ctx.environment === 'EARTH')
    prose.push('You are on Earth, so there is no delay: the flight surgeon is available right now.')
  else if (ctx.groundReplySec === 0)
    prose.push(
      'On the Space Station, contact with the ground is close to real time in this scenario, so there is no meaningful wait.',
    )
  else if (ctx.environment === 'LUNAR')
    prose.push(
      `${cap(groundPhrase(ctx))}: about ${formatShortDuration(env.oneWayDelaySec)} each way, just the time light needs to cross the distance to Earth.`,
    )
  else
    prose.push(
      `${cap(groundPhrase(ctx))}: ${formatShortDuration(env.oneWayDelaySec)} for your message to reach Earth and the same back. NASA cites one-way delays of about 4 to 24 minutes on the way to Mars, and blackouts of up to 2 to 3 weeks around solar conjunction.${cite(['S10', 'S11'])}`,
      'That is why I treat the next steps as yours to take now; the ground reviews them asynchronously.',
    )
  const queued = ctx.outbox.filter((p) => p.status === 'queued').length
  prose.push(
    queued
      ? `${queued} message${queued === 1 ? ' is' : 's are'} queued for the ground.`
      : 'Nothing is queued for the ground right now.',
  )
  return {
    prose,
    consulted: consult(ctx.environment === 'LUNAR' ? 'moon-delay' : 'mars-delay', 'eimo'),
    followUps: ['Prepare a message for the CMO', 'Prepare the ground report'],
  }
}

function routine(ctx: OrbitContext): Narration {
  const items = [...ctx.routine].sort((a, b) => a.time.localeCompare(b.time))
  const open = items.filter((i) => i.status === 'due' || i.status === 'overdue')
  return {
    prose: [
      items.length === 0
        ? `There is no routine scheduled for ${ctx.envLabel} today.`
        : open.length === 0
          ? 'Your routine for today is done or postponed. Nice work.'
          : `Still open today: ${open.map((i) => `${i.title.toLowerCase()} at ${i.time} UTC${i.status === 'overdue' ? ' (overdue)' : ''}`).join('; ')}.`,
      ...(open.length ? ['I can open the measurement for you whenever you are ready.'] : []),
    ],
    consulted: consult('ssm-overview'),
    followUps: ['How am I doing today?'],
  }
}

function prepareReport(ctx: OrbitContext): Narration {
  const top = worst(ctx)
  return {
    prose: [
      `I drafted a message for the ${ctx.environment === 'EARTH' ? 'flight surgeon' : 'CMO'} with what matters: ${
        ctx.alerts.length ? ctx.alerts.map((a) => a.title.toLowerCase()).join('; ') : 'no active alerts'
      }${top && top.level !== 'normal' ? `, the latest ${LOWER_LABEL[top.kind]} reading and when it was taken` : ''}${ctx.trends.length ? ', and the trend I am seeing' : ''}.`,
      `Check it before it goes; nothing is sent until you confirm. ${cap(groundPhrase(ctx))}.`,
      'If the flight surgeons need the whole picture, I can also put together the full ground report.',
    ],
    followUps: ['Prepare the ground report', 'How long until the ground replies?'],
  }
}

function privacy(ctx: OrbitContext): Narration {
  return {
    prose: [
      ctx.role === 'ASTRONAUT'
        ? 'I see all of your data, because it is yours. The CMO sees your vitals, dose and exercise; your mood and sleep stay private. With your consent the CMO sees only the level of a wellbeing alert, never the details, and any emergency access is audited.'
        : 'I only receive what this profile is allowed to see, and I never rebuild what was left out.',
      `NASA standards keep medical communications private.${cite(['S02'])}`,
    ],
    consulted: consult('cmo-role'),
  }
}

function riskOutlook(ctx: OrbitContext, reply: StructuredReply, crewId: string | undefined): Narration {
  const self = ctx.crew.find((c) => c.isSelf)
  const o = crewId ? ctx.crew.find((c) => c.id === crewId) : undefined
  const prose: string[] = []
  if (!o) {
    const order = ['high', 'elevated', 'guarded', 'low'] as const
    const sorted = [...ctx.crew].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
    prose.push(
      `Across the crew, ${sorted
        .map(
          (c) =>
            `${c.isSelf && ctx.role === 'ASTRONAUT' ? 'you' : c.name} ${c.isSelf && ctx.role === 'ASTRONAUT' ? 'are' : 'is'} ${RISK_TEXT[c.level]}${c.hazard ? ` (${lowerFirst(HAZARD_LABEL[c.hazard])})` : ''}`,
        )
        .join(', ')}.`,
    )
    if (self && ctx.role === 'ASTRONAUT' && self.drivers?.length)
      prose.push(
        `What raises yours: ${self.drivers
          .filter((d) => !('restricted' in d))
          .slice(0, 3)
          .map((d) => ('valueText' in d ? `${d.label.toLowerCase()} (${d.valueText})` : d.label))
          .join(', ')}.`,
      )
    prose.push('For crewmates you only see the level; their details stay with them and the medical team.')
  } else if (!o.drivers) {
    prose.push(
      `${o.name} is ${RISK_TEXT[o.level]}. That level is all that is shared with you; the details stay with ${o.name} and the medical team.`,
    )
  } else {
    const who = o.isSelf && ctx.role === 'ASTRONAUT' ? 'Your outlook' : `${o.name}’s outlook`
    const visible = o.drivers.filter((d) => !('restricted' in d))
    prose.push(
      `${who} is ${RISK_TEXT[o.level]}${o.hazard ? `, driven mostly by ${lowerFirst(HAZARD_LABEL[o.hazard])}` : ''}. ${
        visible.length
          ? `The factors I counted: ${visible.map((d) => ('valueText' in d ? `${d.label.toLowerCase()} (${d.valueText})` : d.label)).join('; ')}.`
          : 'No factor is raising it today.'
      }`,
    )
    if (reply.why) prose.push(`${reply.why.text}${cite(reply.why.sourceIds)}`)
  }
  prose.push(
    'This is an outlook, not a prediction: it only says which observed factors raise exposure to a NASA HRP hazard, before anything turns red.',
  )
  return {
    prose,
    consulted: consult('hrp-risks-ssm', 'hrp-hazards', 'analogs'),
    followUps: ['What is driving my outlook?', 'Am I drifting from my baseline?'],
  }
}

function reference(ctx: OrbitContext): Narration {
  const hr = ctx.references.heartRate
  const q = ctx.quality.heartRate
  const prose: string[] = []
  if (!hr || !q) prose.push('There is no pre-flight exam yet, so I have nothing to compare your readings with.')
  else {
    prose.push(
      `Your reference starts with the exam you did on Earth before launch: ${q.n} readings per indicator, from ${q.fromIso.slice(0, 10)} to ${q.toIso.slice(0, 10)}. For resting heart rate that gave ${formatVitalValue('heartRate', q.mean)} bpm, give or take ${q.sd.toFixed(1)}.${q.lowConfidence ? ' That is too few readings to be confident, so treat it as a low-confidence baseline.' : ''}`,
    )
    prose.push(
      hr.origin === 'adapting'
        ? `You changed gravity field recently, so for ${ctx.envLabel} I am rebuilding your reference. Until ${hr.adaptationEndsIso!.slice(0, 10)} I still compare with the pre-flight exam and show attention-level changes as Adapting; urgent is never hidden.`
        : hr.origin === 'adapted'
          ? `${cap(PLACE[ctx.environment])} I also keep a reference rebuilt from your last ${hr.readingsUsed} readings here (${formatVitalValue('heartRate', hr.referenceValue)} bpm for heart rate), so I can tell a change in the environment from a change in you. The pre-flight exam stays the anchor for alerts.`
          : 'On Earth everything is compared with that pre-flight exam, including after you come back.',
    )
    if (ctx.environment !== 'EARTH')
      prose.push(
        'I do not apply a fixed “space correction” to your numbers: there is no sourced shift for this environment, so I only use your own reference.',
      )
  }
  prose.push(
    `NASA's Standard Measures also collect the same measures from each astronaut before, during and after flight, as research data, not as a health or readiness rating.${cite(['S22', 'S23', 'S28'])}`,
  )
  return {
    prose,
    consulted: consult('personal-reference', 'ssm-overview', 'ssm-schedule'),
    followUps: ['Am I drifting from my baseline?', 'Why is my reference different on the Moon?'],
  }
}

function drift(ctx: OrbitContext): Narration {
  const t = ctx.trends
  return {
    prose: t.length
      ? [
          ...t.map(
            (x) =>
              `${cap(LOWER_LABEL[x.kind]!)} has moved ${x.direction} ${x.days} days in a row, about ${Math.abs(Math.round(x.slopePerDay * 10) / 10)} ${VITAL_UNIT[x.kind]} a day, and now sits ${pctText(x.latestDevPct)} ${x.latestDevPct >= 0 ? 'above' : 'below'} your ${x.comparedTo === 'adapted' ? 'reference for this environment' : 'pre-flight reference'}.`,
          ),
          'A steady drift like this can show up before a value crosses a line, which is why I flag it early. It stays a preventive notice: never urgent, and it does not name a cause.',
        ]
      : ['No steady drift in the last two weeks: day-to-day changes go up and down instead of in one direction.'],
    steps:
      t[0] && ctx.role === 'ASTRONAUT'
        ? [{ text: `Re-measure your ${LOWER_LABEL[t[0].kind]} today to see whether the trend continues.` }]
        : undefined,
    consulted: consult('personal-reference', 'ssm-caveat'),
    followUps: ['What should I do now?', 'Where did my reference come from?'],
  }
}

function about(): Narration {
  return {
    prose: [
      `I am ${ASSISTANT_NAME}, the health copilot that flies with you. I read the data the rule engine already checked, explain it in plain words and help you decide when to call the CMO.`,
      `Everything runs onboard, without a connection: a deterministic rule layer decides every color, alert and escalation, and I answer from a local library of ${KNOWLEDGE.length} passages: the ones about health and space cite their sources (mostly NASA), the rest explain how this app works or are simple physical calculations. An optional on-device model can only rephrase my wording. The idea follows NASA work on Earth-independent medical operations.${cite(['S12'])}`,
      'I never change an alert, never name a condition and never replace the flight surgeon. You stay in the loop for every action.',
    ],
    consulted: consult('eimo', 'ssm-caveat'),
    followUps: ['How am I doing today?', 'What can you see?'],
  }
}

/** Pergunta livre: responde só com a base local (RAG); sem passagem relevante, diz que não vai adivinhar. */
export function ragAnswer(question: string, ctx: OrbitContext): Narration {
  const hits = retrieve(question, 3)
  if (!hits.length)
    return {
      prose: [
        'I don’t have a source onboard for that, so I won’t guess. Consult your flight surgeon.',
        'I can talk about your readings, the alerts, radiation and the shelter, the delay to Earth, exercise, your baseline and the crew outlook.',
      ],
      followUps: ['How am I doing today?', 'What should I do now?'],
    }
  const [first, ...rest] = hits
  const prose = [
    `${
      first!.passage.kind === 'app'
        ? pick(['Here is how it works in this prototype.', 'Good question. In this app:', 'Short answer, from how Orbit and the app are built:'], question)
        : first!.passage.sourceIds.length === 0
          ? 'Here is what my onboard library says.'
          : pick(['From the material I carry onboard:', 'Here is what my onboard library says.', 'Based on the sources I have here:'], question)
    } ${first!.passage.text}${cite(first!.passage.sourceIds)}`,
    ...rest
      .filter((h) => h.score >= first!.score * 0.6)
      .slice(0, 1)
      .map((h) => `${h.passage.text}${cite(h.passage.sourceIds)}`),
  ]
  // Liga a resposta aos dados da pessoa quando a pergunta cita uma zona com algo fora da referência.
  const top = worst(ctx)
  if (
    top &&
    top.level !== 'normal' &&
    hits.some((h) => h.passage.id === 'heart-gravity') &&
    zoneOfVital(top.kind) === 'heart'
  )
    prose.push(`For you right now, that matters because your ${LOWER_LABEL[top.kind]} is ${deviationClause(ctx, top)}.`)
  return {
    prose,
    // Só as passagens que entraram no texto.
    consulted: [first!, ...rest.filter((h) => h.score >= first!.score * 0.6).slice(0, 1)].map((h) => ({
      id: h.passage.id,
      title: h.passage.title,
      sourceIds: h.passage.sourceIds,
    })),
    followUps: ['How am I doing today?', 'What should I do now?'],
  }
}

/** Seguimento ("why?", "tell me more"): aprofunda o assunto da última resposta com a base local. */
export function followUpAnswer(lastReply: StructuredReply, ctx: OrbitContext): Narration {
  const ids = (lastReply.consulted ?? []).map((c) => c.id)
  const passages = ids.map(passageById).filter((p): p is Passage => !!p)
  if (!passages.length) return ragAnswer(lastReply.summary, ctx)
  return {
    prose: [
      `${pick(['Sure, here is the background.', 'Happy to go deeper.', 'Here is the reasoning behind it.'], lastReply.id)} ${passages[0]!.text}${cite(passages[0]!.sourceIds)}`,
      ...passages.slice(1, 3).map((p) => `${p.text}${cite(p.sourceIds)}`),
      'Colors and alerts still come only from the rule engine; this is the context behind them.',
    ],
    consulted: passages.map((p) => ({ id: p.id, title: p.title, sourceIds: p.sourceIds })),
    followUps: lastReply.followUps?.filter((f) => !/why/i.test(f)).slice(0, 2),
  }
}

/** Texto corrido para uma resposta estruturada. */
export function narrate(
  reply: StructuredReply,
  ctx: OrbitContext,
  q: { text?: string; zone?: ZoneTarget; crewId?: string } = {},
): Narration {
  const seed = `${reply.intent}:${q.text ?? ''}`
  switch (reply.intent) {
    case 'status':
      return status(ctx, seed)
    case 'whatNow':
      return whatNow(ctx, seed)
    case 'zoneExplain':
      return zoneExplain(ctx, q.zone, seed)
    case 'solarEvent':
      return solarEvent(ctx, seed)
    case 'groundDelay':
      return groundDelay(ctx)
    case 'routine':
      return routine(ctx)
    case 'prepareReport':
      return prepareReport(ctx)
    case 'privacy':
      return privacy(ctx)
    case 'riskOutlook':
      return riskOutlook(
        ctx,
        reply,
        q.crewId ?? (/\b(my|me|i)\b/i.test(q.text ?? '') && ctx.role === 'ASTRONAUT' ? 'A' : undefined),
      )
    case 'reference':
      return reference(ctx)
    case 'drift':
      return drift(ctx)
    case 'about':
      return about()
    case 'groundReport':
      return {
        prose: [
          `I put together the full ground report: alerts, every vital against your pre-flight reference, trends, radiation, exercise, wellbeing, the routine and what you already did today, with the source for each claim.`,
          `It is plain text of a few kilobytes, small enough for a low-bandwidth window. Review it, then download it or queue it; ${groundPhrase(ctx)}.`,
        ],
        followUps: ['How long until the ground replies?'],
      }
    case 'metric': {
      const mq = parseMetric(q.text ?? '') ?? { metric: worst(ctx)?.kind ?? 'heartRate', when: 'latest' as const }
      const m = metricAnswer(ctx, mq)
      const ids =
        mq.metric === 'sleep' || mq.metric === 'mood'
          ? ['sleep-behavior', 'ssm-actigraphy']
          : mq.metric === 'dose'
            ? ['radiation-limit', 'radiation-cruise']
            : mq.metric === 'exercise'
              ? ['bone-muscle', 'iss-exercise']
              : ['personal-reference']
      return { prose: m.prose, followUps: m.followUps, consulted: consult(...ids) }
    }
    case 'environment':
      return environmentAnswer(ctx, environmentIn(q.text ?? '') ?? ctx.environment)
    case 'smalltalk':
      return smalltalk(ctx, q.text ?? '')
    case 'triage':
    case 'general':
      return ragAnswer(q.text ?? '', ctx)
  }
}

/** "What changes on the Moon?": o que muda de verdade no app e o que tem fonte (L8). */
export function environmentAnswer(ctx: OrbitContext, target: MissionMode): Narration {
  const env = ENVIRONMENTS[target]
  const here = target === ctx.environment
  const place = target === 'EARTH' ? 'on Earth' : `on the ${env.label}`
  const prose: string[] = []
  prose.push(
    target === 'EARTH'
      ? `${here ? 'You are on Earth, so' : 'On Earth'} the flight surgeon is reachable directly, with no delay, and everything is compared with your pre-flight exam.`
      : target === 'ISS'
        ? `${here ? 'You are on the Space Station:' : 'On the Space Station'} contact with the ground is close to real time in this scenario, and gravity is micro, as in transit.`
        : target === 'LUNAR'
          ? `${here ? 'You are on the Moon:' : 'On the Moon'} a reply takes about 2.6 seconds (1.3 s each way), and gravity is partial; the exact fraction is not sourced yet, so I don’t quote a number.`
          : `${here ? 'You are aboard the Spacecraft:' : 'Aboard the Spacecraft'} a reply takes about 40 minutes in this scenario (20 minutes each way), with possible blackouts of up to 2 to 3 weeks near solar conjunction.${cite(['S10', 'S11'])} Gravity is micro.`,
  )
  prose.push(
    env.doseRateMSvPerDay === null
      ? `There is no sourced daily radiation dose rate ${place}, so no mission dose is added there.`
      : `Radiation adds about ${env.doseRateMSvPerDay} mSv a day ${place}, the cruise average measured on the way to Mars.${cite(['S08', 'S09'])}`,
  )
  prose.push(
    target === 'ISS'
      ? `Exercise uses ARED, T2 and CEVIS, about two hours a day on average.${cite(['S13'])}`
      : 'There is no sourced exercise equipment list for this environment, so the app does not name devices there.',
  )
  prose.push(`Hazards in focus ${place}: ${env.emphasizedHazards.map((h) => lowerFirst(HAZARD_LABEL[h])).join(', ')}.${cite(['S19'])}`)
  if (!here) prose.push(referenceTransition(ctx.environment, target).text)
  prose.push('Your own data stay the same; what changes is how they are read and escalated. Switch with the Mode buttons at the top.')
  const others = (['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT'] as const).filter((m) => m !== target && m !== ctx.environment)
  return {
    prose,
    consulted: consult(
      target === 'LUNAR' ? 'moon-delay' : target === 'SPACECRAFT' ? 'mars-delay' : target === 'ISS' ? 'iss-exercise' : 'personal-reference',
      'app-environments',
      ...(here ? [] : ['adaptation']),
    ),
    followUps: others.slice(0, 2).map((m) => `What changes ${m === 'EARTH' ? 'on Earth' : `on the ${ENVIRONMENTS[m].label}`}?`),
  }
}

/** Conversa curta: cumprimento, agradecimento, "ok", despedida (L8). */
export function smalltalk(ctx: OrbitContext, text: string): Narration {
  const t = normalize(text)
  const top = worst(ctx)
  // AI-07: a saudação nunca diz "tudo normal" se as regras mostram algo fora do normal em qualquer módulo.
  const alert = [...ctx.alerts].sort((a, b) => (a.level === 'urgent' ? 0 : 1) - (b.level === 'urgent' ? 0 : 1))[0]
  const offZone = (Object.entries(ctx.body) as [string, ZoneStatus | null][]).find(
    ([, s]) => s === 'attention' || s === 'urgent' || s === 'adapting',
  )
  const hook =
    ctx.shelterActive
      ? 'A solar particle event is active, so shelter comes first. Want the steps?'
      : top && top.level !== 'normal'
        ? `Your ${zoneOfVital(top.kind) ?? 'heart'} zone is at ${STATUS_WORD[shownLevel(top.kind, top.level, ctx.body)]} right now. Want me to walk you through it?`
        : alert
          ? `${ctx.alerts.length > 1 ? `You have ${ctx.alerts.length} active alerts. The first one: ` : ''}${STATUS_WORD[alert.level]}: ${alert.title}. Want me to walk you through it?`
          : offZone
            ? `Your ${offZone[0]} zone is at ${STATUS_WORD[offZone[1]!]} right now. Want me to walk you through it?`
            : 'Everything is within your personal reference right now. What would you like to look at?'
  const prose = /\b(thanks|thank you|thx)\b/.test(t)
    ? ['Anytime. I will keep an eye on your readings; ask me whenever something changes.']
    : /\b(bye|goodbye|see you)\b/.test(t)
      ? ['Talk soon. If anything changes, it shows on the body map first.']
      : /^(ok|okay|got it|cool|great|nice|perfect)\b/.test(t)
        ? ['Good. Anything else you want me to check?']
        : [`Hi, I’m here. ${hook}`]
  return { prose, followUps: ['How am I doing today?', 'What should I do now?'] }
}
