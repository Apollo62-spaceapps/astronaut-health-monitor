// Respostas do Orbit (L7 §4–§5). FUNÇÕES PURAS: só regras e contexto, sem React e sem LLM.
// Mesma entrada ⇒ mesma saída. O Orbit LÊ o contexto e PROPÕE ações; nunca muda status, alerta ou fila (AI-07).
// Nunca "fit"/"healthy"/diagnóstico; ações de vitais só Re-measure / Notify CMO / onboard checklist (CORE-09).
import type { OrbitContext } from '@/ai/context'
import {
  ASSISTANT_INTRO,
  ASSISTANT_LIMITS,
  OUTLOOK_DISCLAIMER,
  REFERENCE_DISCLAIMER,
  WITHIN_REFERENCE,
} from '@/ai/identity'
import { draftPacket } from '@/ai/packet'
import { environmentIn } from '@/ai/intent'
import { metricAnswer, parseMetric } from '@/ai/metric'
import type { Fact, Intent, ReplyAction, StatusLine, StructuredReply, ZoneTarget } from '@/ai/schema'
import { BODY_ZONES, HAZARD_LABEL } from '@/domain/config/bodyZones'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { NO_SOURCED_SHIFT } from '@/domain/config/referenceShifts'
import { relatedEvents } from '@/domain/config/riskEvents'
import { TREND_LOOKBACK_DAYS, VITAL_DEVIATION_PCT } from '@/domain/config/thresholds'
import { RATE_NOT_SOURCED, SHELTER_LABEL, SHELTER_STEPS } from '@/domain/rules/radiation'
import { ABSOLUTE_LIMITS_TEXT } from '@/domain/rules/reference'
import type { RiskLevel } from '@/domain/rules/risk'
import { ALERT_LEVEL_ORDER, formatDeviation, type VitalEvaluation } from '@/domain/rules/vitals'
import type { Provenance, SourceId, VitalKind } from '@/domain/types'
import { SSM_CAVEAT } from '@/data/sources'
import { BLACKOUT_NOTE } from '@/features/escalation/blackout'
import { shownLevel, zoneOfVital } from '@/features/overview/phaseDisplay'
import { CONSULT, ZONE_CONTENT } from '@/features/overview/zoneContent'
import { VITAL_LABEL, VITAL_UNIT, formatShortDuration, formatUtc, formatVitalValue } from '@/lib/format'

/** Checagem genérica depois do evento de radiação (P-05: sem lista de sintomas sem fonte). */
export const GENERIC_CHECK = 'How are you feeling? Any new symptoms?'

export const RISK_TEXT: Record<RiskLevel, string> = {
  low: 'Low',
  guarded: 'Guarded',
  elevated: 'Elevated',
  high: 'High',
}
const STATUS_TEXT = {
  normal: 'Normal',
  attention: 'Attention',
  urgent: 'Urgent',
  adapting: 'Adapting',
  restricted: 'Restricted',
}
const NEUTRAL_ROUTINE = { due: 'Due', overdue: 'Overdue', done: 'Done', postponed: 'Postponed' } as const

export interface ReplyOptions {
  zone?: ZoneTarget
  crewId?: string
  /** Texto original (para "my"/"me" no outlook). */
  text?: string
}

// ───────────────────────── helpers ─────────────────────────

const astronaut = (ctx: OrbitContext) => ctx.role === 'ASTRONAUT'
const whose = (ctx: OrbitContext) => (astronaut(ctx) ? 'your' : "the crew member's")
const prov = (p: Provenance): Fact['provenance'] => (p.kind === 'real' ? 'REAL' : 'SIMULATED')
const srcOf = (p: Provenance): SourceId | undefined => (p.kind === 'real' ? p.sourceId : p.basis)
const rank = (l: VitalEvaluation['level']) => ALERT_LEVEL_ORDER.indexOf(l)

/** "Flight surgeon available now" / "Ground reply in ~40 min — safe actions now" (R-ESC-01). */
export function etaText(ctx: Pick<OrbitContext, 'groundReplySec'>): string {
  return ctx.groundReplySec === 0
    ? 'Flight surgeon available now'
    : `Ground reply in ~${formatShortDuration(ctx.groundReplySec)} — safe actions now`
}

/** Escalonamento só quando o MOTOR já tem attention/urgent ou abrigo ativo (nunca opinião do Orbit). */
function engineEscalation(ctx: OrbitContext, reason?: string): StructuredReply['escalate'] {
  if (ctx.shelterActive)
    return {
      level: 'recommended',
      reason: reason ?? 'Solar particle event: shelter active (R-RAD-03).',
      etaText: etaText(ctx),
    }
  if (ctx.worstLevel === 'normal') return undefined
  const top = ctx.alerts[0]
  return {
    level: 'recommended',
    reason: reason ?? (top ? `${STATUS_TEXT[top.level]}: ${top.title} (${top.ruleId}).` : 'Active alert.'),
    etaText: etaText(ctx),
  }
}

function worstVital(ctx: OrbitContext): VitalEvaluation | undefined {
  return [...ctx.vitals].sort(
    (a, b) => rank(b.level) - rank(a.level) || Math.abs(b.deviationPct) - Math.abs(a.deviationPct),
  )[0]
}

export function vitalFact(ctx: OrbitContext, ev: VitalEvaluation): Fact {
  return {
    label: VITAL_LABEL[ev.kind],
    value: formatVitalValue(ev.kind, ev.latest.value),
    unit: VITAL_UNIT[ev.kind],
    provenance: prov(ev.latest.provenance),
    sourceId: srcOf(ev.latest.provenance),
    status: shownLevel(ev.kind, ev.level, ctx.body),
    detail: `${formatDeviation(ev.deviationPct)} vs pre-flight`,
    zone: zoneOfVital(ev.kind) ?? undefined,
  }
}

const offSentence = (ctx: OrbitContext, ev: VitalEvaluation) => {
  const pct = Math.round(Math.abs(ev.deviationPct))
  const shown = shownLevel(ev.kind, ev.level, ctx.body)
  return `${VITAL_LABEL[ev.kind]} is ${pct}% ${ev.deviationPct >= 0 ? 'above' : 'below'} ${whose(ctx)} pre-flight baseline (${STATUS_TEXT[shown]}).`
}

/** Ações seguras para um vital fora do normal. O CMO não registra medida (é do astronauta). */
function vitalActions(ctx: OrbitContext, kind: VitalKind | undefined): ReplyAction[] {
  const a: ReplyAction[] = []
  if (astronaut(ctx) && kind) a.push({ kind: 'remeasure', vital: kind })
  a.push({ kind: 'notifyCmo' }, { kind: 'openChecklist' })
  return a
}

function doseFact(ctx: OrbitContext): Fact {
  const d = ctx.radiation
  if (d.pctOfLimit === null)
    return {
      label: 'Career dose (prior)',
      value: String(Math.round(d.priorMSv)),
      unit: 'mSv',
      provenance: 'SIMULATED',
      detail: `${RATE_NOT_SOURCED}`,
    }
  return {
    label: 'Career dose',
    value: String(Math.round(d.pctOfLimit)),
    unit: '% of 600 mSv',
    provenance: 'SIMULATED',
    sourceId: d.provenance ? srcOf(d.provenance) : 'S09',
    detail: `${Math.round(d.totalMSv!)} mSv · limit [S03]`,
  }
}

function base(
  intent: Intent,
  ctx: OrbitContext,
  rest: Omit<StructuredReply, 'id' | 'intent' | 'engine'>,
): StructuredReply {
  return { id: `${intent}:${ctx.simNowIso}`, intent, engine: 'protocol', ...rest }
}

const wellbeingLimit = (ctx: OrbitContext) =>
  ctx.access.wellbeingDetail === 'full'
    ? []
    : ['Wellbeing (mood and sleep) is private for this profile: shown as Restricted.']

// ───────────────────────── intenções ─────────────────────────

function status(ctx: OrbitContext): StructuredReply {
  const off = ctx.vitals.filter((v) => v.level !== 'normal').sort((a, b) => rank(b.level) - rank(a.level))
  const lines: StatusLine[] = BODY_ZONES.map((z) => {
    const st = ctx.body[z.id]
    const top = ctx.vitals
      .filter((v) => (z.indicators as string[]).includes(v.kind))
      .sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))[0]
    return {
      label: z.label,
      status: st ?? undefined,
      neutral: st ? undefined : 'No data',
      detail:
        st === 'restricted'
          ? 'private medical data'
          : top && st !== 'normal'
            ? `${formatDeviation(top.deviationPct)} vs pre-flight`
            : undefined,
    }
  })
  const pending = ctx.routine.filter((r) => r.status === 'due' || r.status === 'overdue').length
  const summary =
    off.length === 0
      ? `${WITHIN_REFERENCE}${pending ? ` ${pending} routine item${pending === 1 ? ' is' : 's are'} due.` : ''}`
      : `${offSentence(ctx, off[0]!)}${off.length > 1 ? ` ${off.length - 1} more indicator${off.length > 2 ? 's are' : ' is'} outside the reference.` : ''}`
  const facts: Fact[] = ctx.vitals.map((v) => vitalFact(ctx, v))
  facts.push(doseFact(ctx))
  if (ctx.exercise.adherencePct !== null && ctx.access.exerciseAdherence === 'full')
    facts.push({
      label: 'Exercise adherence',
      value: String(Math.round(ctx.exercise.adherencePct)),
      unit: '%',
      provenance: 'SIMULATED',
      detail: `last 7 days · ${ctx.exercise.streakDays}-day streak`,
    })
  return base('status', ctx, {
    summary,
    facts,
    lines,
    actions: off.length ? vitalActions(ctx, off[0]!.kind) : [{ kind: 'goto', tab: 'vitals', label: 'Open Vitals' }],
    escalate: engineEscalation(ctx),
    limits: wellbeingLimit(ctx),
    illustrative: true,
  })
}

function whatNow(ctx: OrbitContext): StructuredReply {
  if (ctx.shelterActive) return solarEvent(ctx, 'whatNow')
  const top = worstVital(ctx)
  if (top && top.level !== 'normal') {
    const shown = shownLevel(top.kind, top.level, ctx.body)
    const lead = astronaut(ctx)
      ? `Re-measure your ${VITAL_LABEL[top.kind].toLowerCase()}, then notify the CMO.`
      : `Ask the crew member to re-measure ${VITAL_LABEL[top.kind].toLowerCase()}, then send the handoff.`
    return base('whatNow', ctx, {
      summary: `${lead} ${offSentence(ctx, top)}`,
      facts: [vitalFact(ctx, top)],
      actions: vitalActions(ctx, top.kind),
      escalate: engineEscalation(ctx),
      note:
        shown === 'adapting'
          ? 'Shown as Adapting during the adaptation window after a gravity change. Urgent is never masked.'
          : undefined,
      illustrative: true,
    })
  }
  const other = ctx.alerts[0]
  if (other)
    return base('whatNow', ctx, {
      summary: `${other.title}. Follow the safe actions, then notify the CMO.`,
      facts: [],
      actions: vitalActions(ctx, undefined),
      escalate: engineEscalation(ctx),
      illustrative: true,
    })
  const trend = ctx.trends[0]
  if (trend)
    return base('whatNow', ctx, {
      summary: `Nothing is outside your reference. ${VITAL_LABEL[trend.kind]} has been drifting ${trend.direction} for ${trend.days} days: re-measure and keep an eye on it.`,
      facts: [trendFact(trend)],
      actions: [
        ...(astronaut(ctx) ? [{ kind: 'remeasure', vital: trend.kind } as const] : []),
        { kind: 'goto', tab: 'reference', label: 'Open Baseline' },
      ],
      note: 'Trend: preventive notice, never urgent.',
      illustrative: true,
    })
  const due = ctx.routine.find((r) => r.kind === 'measure' && (r.status === 'due' || r.status === 'overdue'))
  if (due && astronaut(ctx))
    return base('whatNow', ctx, {
      summary: `${due.title} is ${NEUTRAL_ROUTINE[due.status].toLowerCase()}. Log it when you can.`,
      facts: [],
      actions: due.vital ? [{ kind: 'remeasure', vital: due.vital }] : [],
    })
  return base('whatNow', ctx, {
    summary: `Nothing needs action now. ${WITHIN_REFERENCE} Keep following your mission routine.`,
    facts: [],
    actions: [{ kind: 'goto', tab: 'overview', label: 'Open Overview' }],
  })
}

function zoneExplain(ctx: OrbitContext, zoneId: ZoneTarget | undefined): StructuredReply {
  const target: ZoneTarget = zoneId ?? (worstVital(ctx) ? (zoneOfVital(worstVital(ctx)!.kind) ?? 'heart') : 'heart')
  if (target === 'radiation') return solarEvent(ctx, 'zoneExplain')
  const zone = BODY_ZONES.find((z) => z.id === target)!
  const st = ctx.body[zone.id]
  if (st === 'restricted')
    return base('zoneExplain', ctx, {
      summary: `${zone.label} is private medical data for this profile: shown as Restricted.`,
      facts: [],
      lines: [{ label: zone.label, status: 'restricted', detail: 'private medical data' }],
      actions: [],
      limits: wellbeingLimit(ctx),
    })
  const evs = ctx.vitals.filter((v) => (zone.indicators as string[]).includes(v.kind))
  const top = [...evs].sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))[0]
  const facts: Fact[] = evs.map((v) => vitalFact(ctx, v))
  if ((zone.indicators as string[]).includes('exerciseAdherence') && ctx.exercise.adherencePct !== null)
    facts.push({
      label: 'Weekly exercise adherence',
      value: String(Math.round(ctx.exercise.adherencePct)),
      unit: '%',
      provenance: 'SIMULATED',
      detail: 'self-reported sessions',
    })
  if (zone.id === 'head' && ctx.wellbeing?.length) {
    const last = [...ctx.wellbeing].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!
    facts.push(
      {
        label: 'Mood (self-report)',
        value: String(last.mood),
        unit: 'of 5',
        provenance: 'SIMULATED',
        detail: last.date,
      },
      { label: 'Sleep', value: String(last.sleepHours), unit: 'h', provenance: 'SIMULATED', detail: last.date },
    )
  }
  const parts: string[] = []
  if (!st) parts.push(`No data for ${zone.label} yet.`)
  else if (top && (st === 'attention' || st === 'urgent' || st === 'adapting')) {
    const t = VITAL_DEVIATION_PCT[top.kind]
    parts.push(
      `${zone.label} is ${STATUS_TEXT[st]} because ${offSentence(ctx, top)
        .replace(/ \(\w+\)\.$/, '.')
        .replace(/^./, (c) => c.toLowerCase())}`,
    )
    parts.push(`Attention starts at ${t.attention}% and Urgent at ${t.urgent}% from the baseline.`)
    if (st === 'adapting') parts.push('Shown as Adapting after a gravity change; urgent is never masked.')
  } else if (st) parts.push(`${zone.label} is ${STATUS_TEXT[st]}: within ${whose(ctx)} personal reference.`)
  const content = ZONE_CONTENT[zone.id]
  const hazardText = zone.hazard ? `Related hazard: ${HAZARD_LABEL[zone.hazard]}.` : 'Related hazard: under review.'
  return base('zoneExplain', ctx, {
    summary: parts.join(' '),
    facts,
    why: content.whyItMatters
      ? {
          text: `${content.whyItMatters.text} ${hazardText}`,
          hazard: zone.hazard ?? undefined,
          sourceIds: content.whyItMatters.sourceIds,
        }
      : { text: `${hazardText} ${CONSULT}`, sourceIds: [] },
    actions:
      st === 'attention' || st === 'urgent' || st === 'adapting'
        ? vitalActions(ctx, top?.kind)
        : [{ kind: 'goto', tab: 'vitals', label: 'Open Vitals' }],
    escalate: st === 'attention' || st === 'urgent' ? engineEscalation(ctx) : undefined,
    limits: wellbeingLimit(ctx),
    illustrative: true,
  })
}

function solarEvent(ctx: OrbitContext, intent: Intent = 'solarEvent'): StructuredReply {
  const ev = ctx.event
  if (!ctx.shelterActive || !ev)
    return base(intent, ctx, {
      summary: `No solar particle event is active.${ctx.radiation.pctOfLimit === null ? ` No new mission dose is added in ${ctx.envLabel} (${RATE_NOT_SOURCED}).` : ''}`,
      facts: [doseFact(ctx)],
      why: {
        text: 'Space radiation is one of the five NASA HRP hazards.',
        hazard: 'radiation',
        sourceIds: ['S19', 'S03'],
      },
      actions: [{ kind: 'goto', tab: 'radiation', label: 'Open Radiation' }],
    })
  const facts: Fact[] = [
    { label: 'Event', value: ev.sepID, provenance: 'REAL', sourceId: 'S07' },
    { label: 'Observed', value: formatUtc(ev.eventTime), provenance: 'REAL', sourceId: 'S07' },
    { label: 'Instrument', value: ev.instrument, provenance: 'REAL', sourceId: 'S07' },
  ]
  if (ctx.exercise.postponed)
    facts.push({
      label: 'Exercise today',
      value: String(ctx.exercise.postponed),
      unit: 'postponed',
      provenance: 'SIMULATED',
      detail: 'R-EX-02',
    })
  return base(intent, ctx, {
    summary: `A solar particle event is active: ${astronaut(ctx) ? 'follow' : 'the crew follows'} the shelter procedure now. ${GENERIC_CHECK}`,
    facts,
    lines: SHELTER_STEPS.map((s, i) => ({ label: s, neutral: `Step ${i + 1}` })),
    why: {
      text: `Real event observed near Earth (NASA DONKI), replayed in this scenario. ${SHELTER_LABEL} Exercise is postponed while sheltering.`,
      hazard: 'radiation',
      sourceIds: ['S07', 'S05', 'S19'],
    },
    actions: [{ kind: 'openChecklist' }, { kind: 'notifyCmo' }],
    escalate: engineEscalation(ctx),
  })
}

function groundDelay(ctx: OrbitContext): StructuredReply {
  const env = ENVIRONMENTS[ctx.environment]
  const oneWay = env.oneWayDelaySec
  const summary =
    ctx.groundReplySec === 0
      ? ctx.environment === 'EARTH'
        ? 'Flight surgeon available now.'
        : 'Ground contact is near real time on the Space Station (about 0 s, illustrative).'
      : `A ground reply takes ${formatShortDuration(ctx.groundReplySec)} (${formatShortDuration(oneWay)} each way)${ctx.groundReplySec >= 60 ? ': follow the safe actions now' : ''}.`
  const queued = ctx.outbox.filter((p) => p.status === 'queued')
  return base('groundDelay', ctx, {
    summary: ctx.blackoutPossible ? `${summary} ${BLACKOUT_NOTE}` : summary,
    facts: [
      {
        label: 'One-way delay',
        value: formatShortDuration(oneWay),
        provenance: 'SIMULATED',
        sourceId: ctx.environment === 'SPACECRAFT' ? 'S10' : undefined,
        detail: env.delayNote,
      },
      {
        label: 'Ground reply',
        value: formatShortDuration(ctx.groundReplySec),
        provenance: 'SIMULATED',
        detail: '2 × one-way delay (R-ESC-01)',
      },
      { label: 'Messages queued', value: String(queued.length), provenance: 'SIMULATED', detail: 'store-and-forward' },
    ],
    why:
      ctx.environment === 'SPACECRAFT'
        ? {
            text: 'NASA cites one-way delays of 4–24 min to Mars and blackouts of up to 2–3 weeks.',
            hazard: 'distance',
            sourceIds: ['S10', 'S11'],
          }
        : undefined,
    actions: ctx.groundReplySec > 0 ? [{ kind: 'notifyCmo' }] : [],
  })
}

function routine(ctx: OrbitContext): StructuredReply {
  const items = [...ctx.routine].sort((a, b) => a.time.localeCompare(b.time))
  const count = (s: keyof typeof NEUTRAL_ROUTINE) => items.filter((i) => i.status === s).length
  const due = items.find((r) => r.kind === 'measure' && (r.status === 'due' || r.status === 'overdue'))
  const summary =
    items.length === 0
      ? `No routine items for ${ctx.envLabel}.`
      : count('due') + count('overdue') === 0
        ? `Everything on today's routine is done${count('postponed') ? ' or postponed' : ''}.`
        : `${count('due')} due, ${count('overdue')} overdue, ${count('done')} done today.`
  return base('routine', ctx, {
    summary,
    facts: [],
    lines: items.map((i) => ({ label: i.title, neutral: NEUTRAL_ROUTINE[i.status], detail: `${i.time} UTC` })),
    actions: due?.vital && astronaut(ctx) ? [{ kind: 'remeasure', vital: due.vital }] : [],
    limits: astronaut(ctx) ? [] : ['Measurements are logged by the astronaut.'],
  })
}

function prepareReport(ctx: OrbitContext): StructuredReply {
  const d = draftPacket(ctx)
  return base('prepareReport', ctx, {
    summary: astronaut(ctx)
      ? 'Here is a draft for the CMO. Check it, then queue it: nothing is sent until you confirm.'
      : 'Handoff summary for the flight surgeon, without private wellbeing data. Nothing is sent until you confirm.',
    facts: [
      { label: 'Level', value: STATUS_TEXT[d.level], provenance: 'SIMULATED', status: d.level },
      { label: 'To', value: d.recipientsText, provenance: 'SIMULATED', detail: 'R-ESC-01' },
      { label: 'Reply', value: d.etaText, provenance: 'SIMULATED' },
    ],
    lines: d.lines.map((l) => ({ label: l })),
    actions: [{ kind: 'notifyCmo' }],
    escalate: engineEscalation(ctx),
    limits: wellbeingLimit(ctx),
  })
}

/** Relatório completo para os flight surgeons (pitch, passo 4): o conteúdo vem de report.ts. */
function groundReport(ctx: OrbitContext): StructuredReply {
  return base('groundReport', ctx, {
    summary:
      'The full ground report is ready to review: alerts, vitals against your reference, trends, radiation, exercise, wellbeing and what you already did, with sources.',
    facts: [],
    actions: [{ kind: 'openReport' }, ...(ctx.groundReplySec > 0 ? [{ kind: 'notifyCmo' } as const] : [])],
    escalate: engineEscalation(ctx),
  })
}

function privacy(ctx: OrbitContext): StructuredReply {
  const label = {
    full: 'Visible',
    alertLevelOnly: 'Alert level only',
    ownEntriesOnly: 'Own entries',
    denied: 'Restricted',
  } as const
  const line = (name: string, lvl: keyof typeof label): StatusLine =>
    lvl === 'denied'
      ? { label: name, status: 'restricted', detail: 'not in my context' }
      : { label: name, neutral: label[lvl] }
  const lines = [
    line('Vitals and baselines', ctx.access.vitals),
    line('Radiation dose and events', ctx.access.radiation),
    line('Exercise adherence', ctx.access.exerciseAdherence),
    line('Wellbeing details (mood, sleep)', ctx.access.wellbeingDetail),
    line('Wellbeing alert', ctx.access.wellbeingAlert),
  ]
  const summary = astronaut(ctx)
    ? 'I see all of your data. The CMO sees your vitals, dose and exercise; your mood and sleep stay private, and with your consent the CMO sees only the alert level. Any break-glass access is audited.'
    : `As ${ctx.role === 'CMO' ? 'the CMO' : 'the flight surgeon'}, I only receive what this profile may see. ${ctx.access.wellbeingDetail === 'full' ? 'Wellbeing details are visible and every view is audited.' : 'Wellbeing details are not in my context, and the Head zone shows Restricted.'}`
  return base('privacy', ctx, {
    summary,
    facts: [],
    lines,
    actions: [],
    limits: ['I never rebuild data that was left out of my context.'],
  })
}

function riskOutlook(ctx: OrbitContext, opts: ReplyOptions): StructuredReply {
  const wantsSelf = !opts.crewId && /\b(my|me|i)\b/i.test(opts.text ?? '') && astronaut(ctx)
  const id = opts.crewId ?? (wantsSelf ? 'A' : undefined)
  const sorted = [...ctx.crew].sort(
    (a, b) =>
      (['low', 'guarded', 'elevated', 'high'] as const).indexOf(b.level) -
      (['low', 'guarded', 'elevated', 'high'] as const).indexOf(a.level),
  )
  const o = id ? ctx.crew.find((c) => c.id === id) : undefined
  if (!o) {
    const top = sorted[0]!
    return base('riskOutlook', ctx, {
      summary: `Highest outlook: ${top.isSelf && astronaut(ctx) ? 'you' : top.name} (${RISK_TEXT[top.level]}${top.hazard ? `, ${HAZARD_LABEL[top.hazard].toLowerCase()}` : ''}).`,
      facts: [],
      lines: sorted.map((c) => ({
        label: c.isSelf && astronaut(ctx) ? `${c.name} (you)` : c.name,
        risk: c.level,
        detail: c.hazard ? HAZARD_LABEL[c.hazard] : undefined,
      })),
      actions: [{ kind: 'goto', tab: 'outlook', label: 'Open Crew outlook' }],
      note: OUTLOOK_DISCLAIMER,
      illustrative: true,
    })
  }
  const name = o.isSelf && astronaut(ctx) ? 'Your outlook' : o.name
  if (!o.drivers)
    return base('riskOutlook', ctx, {
      summary: `${o.name}: ${RISK_TEXT[o.level]}. Only the level is shared with you; the details stay with ${o.name} and the medical team.`,
      facts: [],
      lines: [{ label: o.name, risk: o.level, detail: o.hazard ? HAZARD_LABEL[o.hazard] : undefined }],
      actions: [{ kind: 'goto', tab: 'outlook', label: 'Open Crew outlook' }],
      limits: ['Crew details are private to each crew member.'],
      note: OUTLOOK_DISCLAIMER,
      illustrative: true,
    })
  const visible = o.drivers.filter((d): d is Exclude<typeof d, { restricted: true }> => !('restricted' in d))
  const facts: Fact[] = o.drivers.map((d) =>
    'restricted' in d
      ? { label: d.label, value: 'Restricted', provenance: 'SIMULATED', status: 'restricted' }
      : {
          label: d.label,
          value: d.valueText,
          provenance: d.provenance,
          sourceId: d.sourceIds[0],
          status: d.adapting ? 'adapting' : d.score >= 3 ? 'urgent' : d.score >= 1 ? 'attention' : 'normal',
          detail: HAZARD_LABEL[d.hazard],
        },
  )
  const events = o.hazard
    ? relatedEvents(
        o.hazard,
        visible.filter((d) => d.score > 0).map((d) => d.id),
      )
    : []
  const drivers = visible
    .filter((d) => d.score > 0)
    .slice(0, 2)
    .map((d) => d.label.toLowerCase())
  const summary =
    o.level === 'low'
      ? `${name} is Low: no driver is raising it today.`
      : `${name} is ${RISK_TEXT[o.level]}, mainly from ${o.hazard ? HAZARD_LABEL[o.hazard].toLowerCase() : 'several factors'}${drivers.length ? ` (${drivers.join(' and ')})` : ''}.`
  return base('riskOutlook', ctx, {
    summary,
    facts,
    why: o.hazard
      ? {
          text: `${events.length ? `Related HRP risk: ${events.map((e) => e.label.toLowerCase()).join(', ')}.` : 'Related event: under review.'} Mapping reviewed by: pending.`,
          hazard: o.hazard,
          sourceIds: ['S23', 'S19'],
        }
      : undefined,
    actions: [
      ...(o.level === 'elevated' || o.level === 'high' ? [{ kind: 'notifyCmo' } as const] : []),
      { kind: 'goto', tab: 'outlook', label: 'Open Crew outlook' },
    ],
    escalate:
      o.level === 'high' || o.level === 'elevated'
        ? {
            level: o.level === 'high' ? 'recommended' : 'consider',
            reason: `Risk outlook ${RISK_TEXT[o.level]} (R-RISK-01).`,
            etaText: etaText(ctx),
          }
        : undefined,
    limits: o.drivers.some((d) => 'restricted' in d) ? ['Mood and sleep drivers are private for this profile.'] : [],
    note: OUTLOOK_DISCLAIMER,
    illustrative: true,
  })
}

function trendFact(t: OrbitContext['trends'][number]): Fact {
  const unit = VITAL_UNIT[t.kind]
  return {
    label: `${VITAL_LABEL[t.kind]} trend`,
    value: `${t.direction === 'up' ? '+' : '-'}${Math.abs(Math.round(t.slopePerDay * 10) / 10)}`,
    unit: `${unit}/day`,
    provenance: 'SIMULATED',
    status: 'attention',
    detail: `${t.days} days · ${formatDeviation(t.latestDevPct)} vs ${t.comparedTo === 'adapted' ? 'adapted reference' : 'pre-flight'}`,
  }
}

const ORIGIN_TEXT = {
  'pre-flight': 'pre-flight exam',
  adapting: 'adapting (pre-flight until the window ends)',
  adapted: 'rebuilt here',
} as const

function reference(ctx: OrbitContext): StructuredReply {
  const refs = Object.values(ctx.references)
  const hr = ctx.references.heartRate
  const q = ctx.quality.heartRate
  const facts: Fact[] = refs.map((r) => {
    const quality = ctx.quality[r.kind]
    return {
      label: VITAL_LABEL[r.kind],
      value: formatVitalValue(r.kind, r.referenceValue),
      unit: VITAL_UNIT[r.kind],
      provenance: 'SIMULATED',
      detail: `${ORIGIN_TEXT[r.origin]}${quality ? ` · ${quality.n} readings${quality.lowConfidence ? ' · Low-confidence baseline' : ''}` : ''}`,
    }
  })
  const exam = q ? `${q.n} readings from ${q.fromIso.slice(0, 10)} to ${q.toIso.slice(0, 10)}` : 'no exam readings'
  const summary = !hr
    ? 'There is no pre-flight exam yet, so I have no reference to compare with.'
    : hr.origin === 'adapting'
      ? `You changed gravity field: ${whose(ctx)} reference for ${ctx.envLabel} is being rebuilt until ${hr.adaptationEndsIso!.slice(0, 10)}. Until then readings are compared with the pre-flight exam (${exam}).`
      : hr.origin === 'adapted'
        ? `On ${ctx.envLabel}, ${whose(ctx)} reference is rebuilt from the last ${hr.readingsUsed} readings here; the pre-flight exam (${exam}) stays as the anchor.`
        : `${astronaut(ctx) ? 'Your' : "The crew member's"} reference is the pre-flight exam on Earth: ${exam}.`
  return base('reference', ctx, {
    summary,
    facts,
    why: {
      text: 'NASA Standard Measures follow each person before, during and after flight to compare them with themselves.',
      sourceIds: ['S23', 'S28'],
    },
    actions: [{ kind: 'goto', tab: 'reference', label: 'Open Baseline' }],
    limits: [ABSOLUTE_LIMITS_TEXT, ...(ctx.environment === 'EARTH' ? [] : [NO_SOURCED_SHIFT])],
    note: REFERENCE_DISCLAIMER,
    illustrative: true,
  })
}

function drift(ctx: OrbitContext): StructuredReply {
  const t = ctx.trends
  const summary =
    t.length === 0
      ? `No steady drift in the last ${TREND_LOOKBACK_DAYS} days.`
      : t
          .map(
            (x) =>
              `${VITAL_LABEL[x.kind]} has been drifting ${x.direction} for ${x.days} days (${formatDeviation(x.latestDevPct)} vs ${x.comparedTo === 'adapted' ? 'the adapted reference' : 'pre-flight'}).`,
          )
          .join(' ')
  return base('drift', ctx, {
    summary,
    facts: t.map(trendFact),
    actions: [
      ...(t[0] && astronaut(ctx) ? [{ kind: 'remeasure', vital: t[0].kind } as const] : []),
      { kind: 'goto', tab: 'reference', label: 'Open Baseline' },
    ],
    escalate: engineEscalation(ctx),
    note: 'Trend: preventive notice (R-TREND-01), never urgent.',
    illustrative: true,
  })
}

function about(ctx: OrbitContext): StructuredReply {
  return base('about', ctx, {
    summary: ASSISTANT_INTRO,
    facts: [],
    lines: ASSISTANT_LIMITS.map((l) => ({ label: l })),
    why: {
      text: 'Inspired by NASA research on Earth-independent medical operations: support close to the crew when the ground is far. Not endorsed by NASA.',
      sourceIds: ['S12'],
    },
    actions: [],
    limits: [SSM_CAVEAT, 'Decision-support prototype — not a medical device.'],
  })
}

function general(ctx: OrbitContext): StructuredReply {
  return base('general', ctx, {
    summary:
      'I can help with your status, what to do now, an alert or zone, the solar event, the ground delay, your routine, your baseline and drift, the crew outlook and a message for the CMO.',
    facts: [],
    actions: [],
  })
}

/** Resposta determinística completa para uma intenção. A triagem tem fluxo próprio (triage.ts). */
export function buildReply(intent: Intent, ctx: OrbitContext, opts: ReplyOptions = {}): StructuredReply {
  switch (intent) {
    case 'status':
      return status(ctx)
    case 'whatNow':
      return whatNow(ctx)
    case 'zoneExplain':
      return zoneExplain(ctx, opts.zone)
    case 'solarEvent':
      return solarEvent(ctx)
    case 'groundDelay':
      return groundDelay(ctx)
    case 'routine':
      return routine(ctx)
    case 'prepareReport':
      return prepareReport(ctx)
    case 'groundReport':
      return groundReport(ctx)
    case 'privacy':
      return privacy(ctx)
    case 'riskOutlook':
      return riskOutlook(ctx, opts)
    case 'reference':
      return reference(ctx)
    case 'drift':
      return drift(ctx)
    case 'about':
      return about(ctx)
    case 'metric': {
      // L8: valor de um indicador; sem indicador reconhecido, o da zona com algo fora da referência.
      const q = parseMetric(opts.text ?? '') ?? { metric: worstVital(ctx)?.kind ?? 'heartRate', when: 'latest' }
      const m = metricAnswer(ctx, q)
      return base('metric', ctx, {
        summary: m.prose[0]!.replace(/\s*\[S\d+(?:, S\d+)*\]/g, ''),
        facts: m.facts,
        actions: m.offVital && astronaut(ctx) ? [{ kind: 'remeasure', vital: m.offVital }] : [],
        illustrative: m.facts.some((f) => !!f.status),
      })
    }
    case 'environment': {
      const target = environmentIn(opts.text ?? '') ?? ctx.environment
      const env = ENVIRONMENTS[target]
      const reply = 2 * env.oneWayDelaySec
      return base('environment', ctx, {
        summary: `What changes ${target === 'EARTH' ? 'on Earth' : `on the ${env.label}`}.`,
        facts: [
          { label: 'Ground reply', value: formatShortDuration(reply), provenance: 'SIMULATED', detail: env.delayNote, sourceId: target === 'SPACECRAFT' ? 'S10' : undefined },
          {
            label: 'Daily dose rate',
            value: env.doseRateMSvPerDay === null ? 'not sourced' : String(env.doseRateMSvPerDay),
            unit: env.doseRateMSvPerDay === null ? undefined : 'mSv/day',
            provenance: 'SIMULATED',
            sourceId: env.doseRateMSvPerDay === null ? undefined : 'S09',
          },
        ],
        actions: [{ kind: 'goto', tab: 'reference', label: 'Open Baseline' }],
      })
    }
    case 'smalltalk':
      return base('smalltalk', ctx, { summary: 'Hi.', facts: [], actions: [] })
    case 'triage':
    case 'general':
      return general(ctx)
  }
}

/** Chips de sugestão (no máximo 5), conforme o contexto. */
export function suggestions(ctx: OrbitContext): string[] {
  const s: string[] = []
  if (ctx.shelterActive) s.push('What do I do about the solar event?')
  const top = worstVital(ctx)
  if (top && top.level !== 'normal') {
    const zone = zoneOfVital(top.kind)
    const st = zone ? ctx.body[zone] : null
    if (zone && st) s.push(`Why is my ${zone} zone ${STATUS_TEXT[st].toLowerCase()}?`)
  }
  s.push(astronaut(ctx) ? 'How am I doing today?' : 'How is the crew member doing?', 'What should I do now?')
  if (ctx.trends.length) s.push('Am I drifting from my baseline?')
  s.push(
    'Prepare the ground report',
    'How long until the ground replies?',
    'Who is at higher risk?',
    'What can you see?',
  )
  return [...new Set(s)].slice(0, 5)
}
