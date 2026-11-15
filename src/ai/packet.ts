// Rascunho do pacote para o CMO / solo (L7 §5.7). Usa R-ESC-01 (domain/rules/escalation.ts). Função PURA.
// O Orbit só RASCUNHA: o pacote entra na fila quando a pessoa confirma (store.enqueuePacket, ESC-02…04).
// Perfil CMO / Flight Surgeon: vira "handoff" sem dado privado de bem-estar.
import type { OrbitContext } from '@/ai/context'
import { PACKET_ORIGIN } from '@/ai/identity'
import { escalate } from '@/domain/rules/escalation'
import { formatDeviation } from '@/domain/rules/vitals'
import type { AlertLevel, OutboundPacket, Role } from '@/domain/types'
import { VITAL_LABEL, formatShortDuration, formatUtcTime, formatVitalValue, VITAL_UNIT } from '@/lib/format'

export interface PacketDraft {
  level: AlertLevel
  priority: OutboundPacket['priority']
  recipients: Role[]
  recipientsText: string
  etaSec: number
  etaText: string
  /** Linhas do pacote, na ordem em que aparecem na prévia. */
  lines: string[]
  /** Texto que entra na fila (OutboundPacket.summary). */
  summary: string
  handoff: boolean
}

const ROLE_TEXT: Record<Role, string> = { CMO: 'CMO', FLIGHT_SURGEON: 'flight surgeon', ASTRONAUT: 'astronaut' }

export function draftPacket(ctx: OrbitContext, opts: { report?: string } = {}): PacketDraft {
  const handoff = ctx.role !== 'ASTRONAUT'
  // Relato da triagem ou alerta do motor: no mínimo "attention" para chegar ao CMO.
  const level: AlertLevel =
    ctx.worstLevel !== 'normal' ? ctx.worstLevel : opts.report || ctx.shelterActive ? 'attention' : 'normal'
  const decision = escalate(ctx.shelterActive ? 'urgent' : level, ctx.environment)
  const recipients: Role[] = handoff
    ? ['FLIGHT_SURGEON']
    : decision.escalateTo.length
      ? decision.escalateTo
      : ctx.environment === 'EARTH'
        ? ['FLIGHT_SURGEON']
        : ['CMO']
  const etaText =
    decision.etaGroundReplySec === 0
      ? 'Flight surgeon available now'
      : `Ground reply in ~${formatShortDuration(decision.etaGroundReplySec)} — safe actions now`

  const lines: string[] = []
  lines.push(
    `${handoff ? 'Handoff' : 'Report'} · ${ctx.envLabel} · mission day ${ctx.missionDay} · ${formatUtcTime(ctx.simNowIso)} (simulated)`,
  )
  if (ctx.shelterActive && ctx.event)
    lines.push(`Solar particle event ${ctx.event.sepID} (NASA DONKI, replayed): shelter active.`)
  for (const a of ctx.alerts) lines.push(`[${a.level}] ${a.title} (${a.ruleId})`)
  const off = ctx.vitals.filter((v) => v.level !== 'normal')
  for (const v of off)
    lines.push(
      `${VITAL_LABEL[v.kind]}: ${formatVitalValue(v.kind, v.latest.value)} ${VITAL_UNIT[v.kind]} (${formatDeviation(v.deviationPct)} vs pre-flight), last measured ${formatUtcTime(v.latest.takenAt)}.`,
    )
  for (const t of ctx.trends)
    lines.push(`Trend: ${VITAL_LABEL[t.kind].toLowerCase()} drifting ${t.direction} for ${t.days} days.`)
  if (opts.report) lines.push(`Crew report (own words): "${opts.report}"`)
  if (lines.length === 1) lines.push('No active alerts.')
  lines.push(`${handoff ? 'Prepared by Orbit' : PACKET_ORIGIN}.`)

  return {
    level,
    priority: ctx.shelterActive || level === 'urgent' ? 'priority' : 'normal',
    recipients,
    recipientsText: recipients.map((r) => ROLE_TEXT[r]).join(' and '),
    etaSec: decision.etaGroundReplySec,
    etaText,
    lines,
    summary: lines.join(' · '),
    handoff,
  }
}
