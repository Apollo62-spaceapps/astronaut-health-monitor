// Prévia do pacote para o CMO (L7 §5.7): o Orbit rascunha, a pessoa confere e confirma. Só então o pacote entra
// na fila store-and-forward (store.enqueuePacket, ESC-02…04). Cancelar não muda nada.
import { draftPacket } from '@/ai/packet'
import { PACKET_ORIGIN } from '@/ai/identity'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/state/store'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'

export function PacketPreview() {
  const packet = useOrbitStore((s) => s.packet)
  const setPacket = useOrbitStore((s) => s.setPacket)
  const push = useOrbitStore((s) => s.push)
  const enqueuePacket = useAppStore((s) => s.enqueuePacket)
  const ctx = useOrbitContext()
  const draft = packet ? draftPacket(ctx, { report: packet.report }) : null

  const confirm = () => {
    if (!draft) return
    enqueuePacket(draft.summary, draft.priority)
    push({
      role: 'orbit',
      at: ctx.simNowIso,
      reply: {
        id: `queued:${ctx.simNowIso}`,
        intent: 'prepareReport',
        summary:
          draft.etaSec === 0
            ? `Sent to the ${draft.recipientsText}. ${draft.etaText}.`
            : `Queued for the ${draft.recipientsText}. ${draft.etaText}.`,
        facts: [],
        lines: [{ label: draft.handoff ? 'Prepared by Orbit, confirmed by you' : PACKET_ORIGIN }],
        actions: [],
        engine: 'protocol',
      },
    })
    setPacket(null)
  }

  return (
    <Dialog open={!!draft} onOpenChange={(open) => !open && setPacket(null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{draft?.handoff ? 'Handoff to the flight surgeon' : 'Message for the CMO'}</DialogTitle>
          <DialogDescription>
            {PACKET_ORIGIN.replace(', confirmed by you', '')}. Nothing is sent until you confirm.
          </DialogDescription>
        </DialogHeader>
        {draft && (
          <div className="space-y-3 text-sm">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusBadge status={draft.level} />
              <span>To: {draft.recipientsText}</span>
              <span className="text-muted">· {draft.etaText}</span>
              {draft.priority === 'priority' && <span className="font-semibold">· Priority</span>}
            </p>
            <ul className="space-y-1 rounded-md bg-surface-2 p-3">
              {draft.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setPacket(null)}>
            Cancel
          </Button>
          <Button onClick={confirm}>{draft?.etaSec === 0 ? 'Send now' : 'Queue for CMO'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
