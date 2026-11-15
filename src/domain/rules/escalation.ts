// R-ESC-01 (SPEC §7, §6.5, adendo §17): nível + ambiente → destinatários, ETA (2 × atraso) e pacote.
// ESC-02: normal → nada; attention → avisa o CMO e põe pacote na fila; urgent → CMO na hora + pacote PRIORITÁRIO.
// Earth: o flight surgeon está acessível direto ("Flight surgeon available now"), sem fila.
// Funções PURAS (o id e o horário do pacote entram como parâmetro).
import { groundReplySec } from '@/domain/config/environments'
import type { Alert, AlertLevel, MissionMode, OutboundPacket, Role } from '@/domain/types'

export interface EscalationDecision {
  escalateTo: Role[]
  enqueue: boolean
  priority: OutboundPacket['priority']
  etaGroundReplySec: number
  /** Texto da UI (inglês) para o painel de comunicação (ESC-03). */
  replyText: string
  ruleId: 'R-ESC-01'
}

/** Texto do tempo de resposta do solo (ESC-03). */
export function groundReplyText(sec: number): string {
  if (sec === 0) return 'Flight surgeon available now.'
  if (sec < 60) return `Ground reply in ~${sec.toFixed(1)} s.`
  return `Ground reply in ~${Math.round(sec / 60)} min. Follow these safe actions now.`
}

/** R-ESC-01. Mesma assinatura da função temporária `escalateTemp` (K6). */
export function escalate(level: AlertLevel, mode: MissionMode): EscalationDecision {
  const etaGroundReplySec = groundReplySec(mode)
  const base = { etaGroundReplySec, replyText: groundReplyText(etaGroundReplySec), ruleId: 'R-ESC-01' as const }
  if (level === 'normal') return { ...base, escalateTo: [], enqueue: false, priority: 'normal' }
  const priority = level === 'urgent' ? 'priority' : 'normal'
  if (mode === 'EARTH') return { ...base, escalateTo: ['FLIGHT_SURGEON'], enqueue: false, priority }
  return { ...base, escalateTo: ['CMO', 'FLIGHT_SURGEON'], enqueue: true, priority }
}

/** Pacote store-and-forward ao solo (ESC-04) com o ambiente em que foi criado (ENV-05). */
export function buildPacket(
  alerts: readonly Alert[],
  mode: MissionMode,
  nowIso: string,
  id: string,
  envLabel?: string,
): OutboundPacket {
  const worst: AlertLevel = alerts.some((a) => a.level === 'urgent')
    ? 'urgent'
    : alerts.some((a) => a.level === 'attention')
      ? 'attention'
      : 'normal'
  const decision = escalate(worst, mode)
  return {
    id,
    createdAt: nowIso,
    summary:
      alerts.length > 0
        ? alerts.map((a) => `[${a.level}] ${a.title}`).join(' · ')
        : `Daily summary${envLabel ? ` — ${envLabel}` : ''}, no active alerts.`,
    etaGroundReplySec: decision.etaGroundReplySec,
    status: 'queued',
    environment: mode,
    priority: decision.priority,
  }
}
