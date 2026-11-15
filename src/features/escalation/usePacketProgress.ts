import { useEffect } from 'react'
import { useAppStore } from '@/state/store'
import { isBlackoutActive } from '@/features/escalation/blackout'

/**
 * Simula o store-and-forward (ESC-04): queued → sent (assim que há link) → reply-received
 * depois de etaGroundReplySec. Com `timeAcceleration` > 1 o tempo é acelerado para a demo
 * (a tela mostra o rótulo "time-accelerated for demo", DEMO-02). Nenhuma rede real é usada.
 * Durante um apagão (ESC-05) nada anda: os pacotes ficam queued e as respostas não chegam.
 */
export function usePacketProgress() {
  const outbox = useAppStore((s) => s.outbox)
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const setPacketStatus = useAppStore((s) => s.setPacketStatus)
  const blackout = useAppStore((s) => isBlackoutActive(s.environment, s.commBlackout))

  useEffect(() => {
    if (blackout) return
    const timers: ReturnType<typeof setTimeout>[] = []
    for (const p of outbox) {
      if (p.status === 'queued') {
        timers.push(setTimeout(() => setPacketStatus(p.id, 'sent'), 800))
      } else if (p.status === 'sent') {
        const ms = Math.max(300, (p.etaGroundReplySec * 1000) / acceleration)
        timers.push(setTimeout(() => setPacketStatus(p.id, 'reply-received'), ms))
      }
    }
    return () => timers.forEach(clearTimeout)
  }, [outbox, acceleration, blackout, setPacketStatus])
}
