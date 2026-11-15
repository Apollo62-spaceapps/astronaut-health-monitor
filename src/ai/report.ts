// Relatório completo para os flight surgeons (L7b, pitch passo 4: "relatório assíncrono para a Terra").
// Função PURA: junta o que o motor de regras e os derivados já calcularam num texto leve (Markdown, poucos kB),
// para revisão em solo numa janela de banda baixa. Não decide nada, não diagnostica, cita a fonte de cada afirmação.
// Bem-estar (humor e sono) é privado: entra só se o astronauta incluir (o flight surgeon tem acesso pela matriz §6.7).
import type { OrbitContext } from '@/ai/context'
import { narrate } from '@/ai/narrate'
import { buildReply } from '@/ai/reply'
import { sourceById } from '@/data/sources'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { formatDeviation } from '@/domain/rules/vitals'
import type { SourceId } from '@/domain/types'
import { VITAL_LABEL, VITAL_UNIT, formatShortDuration, formatUtc, formatUtcTime, formatVitalValue } from '@/lib/format'

export interface GroundReport {
  title: string
  markdown: string
  /** Tamanho em bytes (UTF-8), mostrado como "x kB" (cabe numa janela de banda baixa). */
  bytes: number
  /** Resumo curto para a fila store-and-forward. */
  packetSummary: string
  sourceIds: SourceId[]
}

export interface ReportOptions {
  includeWellbeing: boolean
  /** Relatos da tripulação na triagem, nas palavras dela. */
  crewReports?: string[]
}

const STATUS = {
  normal: 'Normal',
  attention: 'Attention',
  urgent: 'Urgent',
  adapting: 'Adapting',
  restricted: 'Restricted',
}
const strip = (s: string) => s.replace(/\s*\[S\d+(?:, S\d+)*\]/g, '')

export function buildGroundReport(ctx: OrbitContext, opts: ReportOptions): GroundReport {
  const used = new Set<SourceId>()
  const src = (...ids: SourceId[]) => {
    ids.forEach((i) => used.add(i))
    return ids.length ? ` [${ids.join(', ')}]` : ''
  }
  const env = ENVIRONMENTS[ctx.environment]
  const L: string[] = []
  const title = `Ground report · Crew A · mission day ${ctx.missionDay}`

  L.push(`# ${title}`)
  L.push('')
  L.push(
    `${env.label} · generated ${formatUtc(ctx.simNowIso)} (simulated clock) by Orbit, onboard health copilot. Decision-support prototype — not a medical device. Numbers are SIMULATED unless marked REAL.`,
  )

  // Resumo em texto corrido (mesma voz do Orbit), com as citações.
  const status = narrate(buildReply('status', ctx), ctx, { text: 'report' })
  L.push('', '## Summary', '')
  for (const p of status.prose) {
    for (const m of p.matchAll(/\[(S\d+(?:, S\d+)*)\]/g)) m[1]!.split(', ').forEach((i) => used.add(i as SourceId))
    L.push(p, '')
  }

  L.push('', '## Alerts and escalation (rule engine)', '')
  if (ctx.alerts.length === 0) L.push('- No active alerts.')
  for (const a of ctx.alerts)
    L.push(
      `- ${STATUS[a.level]}: ${a.title} (${a.ruleId}). Escalated to: ${a.escalateTo.map((r) => (r === 'FLIGHT_SURGEON' ? 'flight surgeon' : r)).join(', ') || 'none'}.`,
    )
  L.push(
    `- Ground reply: ${ctx.groundReplySec === 0 ? 'flight surgeon available now' : `~${formatShortDuration(ctx.groundReplySec)} (2 × ${formatShortDuration(env.oneWayDelaySec)} one way)`}${ctx.environment === 'SPACECRAFT' ? src('S10', 'S11') : ''}.`,
  )
  L.push('- Thresholds are illustrative placeholders until sourced (P-01); levels are never set by Orbit.')

  L.push('', '## Vitals against the personal reference', '')
  L.push('| Indicator | Latest (SIMULATED) | Taken | Pre-flight reference | Deviation | Level |')
  L.push('|---|---|---|---|---|---|')
  for (const v of ctx.vitals) {
    const q = ctx.quality[v.kind]
    L.push(
      `| ${VITAL_LABEL[v.kind]} | ${formatVitalValue(v.kind, v.latest.value)} ${VITAL_UNIT[v.kind]} | ${formatUtcTime(v.latest.takenAt)} | ${formatVitalValue(v.kind, v.baseline.preflightMean)} ${VITAL_UNIT[v.kind]}${q ? ` (n=${q.n}, SD ${q.sd.toFixed(v.kind === 'bodyTemp' ? 2 : 1)}${q.lowConfidence ? ', low confidence' : ''})` : ''} | ${formatDeviation(v.deviationPct)} | ${STATUS[v.level]} |`,
    )
  }
  const hr = ctx.references.heartRate
  if (hr)
    L.push(
      '',
      `Reference for ${env.label}: ${hr.origin === 'adapting' ? `adapting after a gravity change, until ${hr.adaptationEndsIso!.slice(0, 10)}` : hr.origin === 'adapted' ? `rebuilt from ${hr.readingsUsed} readings in this environment` : 'pre-flight exam'}. No sourced physiological shift is applied for this environment.${src('S23')}`,
    )
  if (ctx.trends.length)
    for (const t of ctx.trends)
      L.push(
        `- Trend (R-TREND-01): ${VITAL_LABEL[t.kind].toLowerCase()} ${t.direction} ${t.days} days in a row, about ${Math.abs(Math.round(t.slopePerDay * 10) / 10)} ${VITAL_UNIT[t.kind]}/day, ${formatDeviation(t.latestDevPct)} vs ${t.comparedTo === 'adapted' ? 'adapted reference' : 'pre-flight'}. Preventive notice.`,
      )

  L.push('', '## Radiation', '')
  const d = ctx.radiation
  L.push(
    d.pctOfLimit === null
      ? `- Career dose: ${Math.round(d.priorMSv)} mSv prior (SIMULATED); no mission dose added in ${env.label} (rate not sourced). Limit 600 mSv${src('S03')}.`
      : `- Career dose: ${Math.round(d.totalMSv!)} mSv = ${Math.round(d.pctOfLimit)}% of the 600 mSv limit${src('S03')} (SIMULATED, daily rate from MSL/RAD cruise${src('S09')}).`,
  )
  if (ctx.shelterActive && ctx.event)
    L.push(
      `- Solar particle event ${ctx.event.sepID} (REAL, NASA DONKI, replayed)${src('S07')}: shelter procedure active, adapted from NASA Orion${src('S05')}.`,
    )

  L.push('', '## Exercise', '')
  L.push(
    `- Weekly adherence: ${ctx.exercise.adherencePct === null ? 'no plan in window' : `${Math.round(ctx.exercise.adherencePct)}%`} · ${ctx.exercise.streakDays}-day streak · ${ctx.exercise.postponed} session(s) postponed today (self-reported, SIMULATED).`,
  )

  L.push('', '## Wellbeing (private)', '')
  if (!opts.includeWellbeing || !ctx.wellbeing) L.push('- Not included by the astronaut.')
  else {
    const last = [...ctx.wellbeing].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
    L.push(
      `- Last ${last.length} days, self-report (SIMULATED), mood 1–5 / sleep hours: ${last.map((w) => `${w.date.slice(5)} ${w.mood}/${w.sleepHours}h`).join(', ')}.`,
    )
  }

  L.push('', '## Routine today', '')
  if (!ctx.routine.length) L.push('- No routine scheduled.')
  for (const r of [...ctx.routine].sort((a, b) => a.time.localeCompare(b.time)))
    L.push(`- ${r.time} UTC · ${r.title}: ${r.status}.`)

  L.push('', '## What the crew already did', '')
  const queued = ctx.outbox
  L.push(
    `- Messages to the ground: ${queued.length ? queued.map((p) => `${formatUtcTime(p.createdAt)} ${p.status}`).join('; ') : 'none yet'}.`,
  )
  for (const r of opts.crewReports ?? []) L.push(`- Crew report (own words): "${r}"`)

  const self = ctx.crew.find((c) => c.isSelf)
  if (self)
    L.push(
      '',
      '## Risk outlook (R-RISK-01)',
      '',
      `- Crew A: ${self.level}${self.hazard ? `, mainly ${self.hazard}` : ''}. Outlook, not a prediction; illustrative thresholds${src('S23', 'S19')}.`,
    )

  L.push('', '## Sources', '')
  const ids = [...used].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
  for (const id of ids) {
    const s = sourceById(id)
    if (s) L.push(`- [${id}] ${s.provider} — ${s.title}. ${s.urls[0] ?? ''}`)
  }

  const markdown = L.join('\n')
  const bytes = new TextEncoder().encode(markdown).length
  const top = ctx.alerts[0]
  return {
    title,
    markdown,
    bytes,
    sourceIds: ids,
    packetSummary: `Ground report (${(bytes / 1024).toFixed(1)} kB), mission day ${ctx.missionDay}, ${env.label}: ${top ? `${STATUS[top.level]} — ${strip(top.title)}` : 'no active alerts'}. Drafted by Orbit, confirmed by you.`,
  }
}
