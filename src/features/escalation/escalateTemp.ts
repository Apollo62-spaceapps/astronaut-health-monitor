// TODO(Lucas): trocar pela regra real R-ESC-01 (src/domain/rules/escalation.ts, task L2 #53).
// Função TEMPORÁRIA com a assinatura combinada, para a tela de comunicação (K6) andar antes da L2.
// Comportamento da SPEC ESC-02: normal → nada; attention → avisa o CMO e põe pacote na fila;
// urgent → avisa o CMO na hora e põe pacote PRIORITÁRIO. ETA = 2 × atraso (ESC-03).
import { groundReplySec } from '@/domain/config/environments'
import type { AlertLevel, MissionMode, OutboundPacket, Role } from '@/domain/types'

export interface EscalationDecision {
  escalateTo: Role[]
  enqueue: boolean
  priority: OutboundPacket['priority']
  etaGroundReplySec: number
}

export function escalate(level: AlertLevel, mode: MissionMode): EscalationDecision {
  const etaGroundReplySec = groundReplySec(mode)
  if (level === 'normal') return { escalateTo: [], enqueue: false, priority: 'normal', etaGroundReplySec }
  return {
    escalateTo: ['CMO', 'FLIGHT_SURGEON'],
    enqueue: true,
    priority: level === 'urgent' ? 'priority' : 'normal',
    etaGroundReplySec,
  }
}
