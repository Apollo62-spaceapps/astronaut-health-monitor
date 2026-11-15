// Emergência (Orbit proativo): quando o motor de regras marca um VITAL como Urgent (R-VIT-02), o Orbit interrompe
// com um aviso em tela cheia: "This needs a person now", o porquê, o atraso até o solo e só ações NÃO clínicas
// (CORE-09; orientação de tratamento exige fonte médica, P-12). Quem decide o Urgent são as regras (AI-07).
// "Notify CMO now" põe um pacote prioritário na fila store-and-forward (ESC-03/04).
import { useMemo, useState } from 'react'
import { ASSISTANT_NAME } from '@/ai/identity'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/StatusBadge'
import { groundReplySec } from '@/domain/config/environments'
import { privacyOf, visibleAlerts } from '@/domain/rules/engine'
import { OrbitMark } from '@/features/assistant/OrbitMark'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { formatShortDuration } from '@/lib/format'
import { useAppStore } from '@/state/store'

const KEY = 'orbit-emergency-acknowledged'
const readAck = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export const EMERGENCY_STEPS = [
  'Notify the CMO now.',
  'Re-measure to confirm the reading.',
  'Follow the onboard medical checklist.',
] as const

export function OrbitEmergency() {
  const alerts = useAppStore((s) => s.alerts)
  const role = useAppStore((s) => s.role)
  const consent = useAppStore((s) => s.consent)
  const breakGlass = useAppStore((s) => s.breakGlass)
  const environment = useAppStore((s) => s.environment)
  const enqueuePacket = useAppStore((s) => s.enqueuePacket)
  const [ack, setAck] = useState<string[]>(readAck)
  const [sent, setSent] = useState(false)

  // Só vital Urgent (o abrigo solar tem o próprio fluxo na faixa da missão e na Radiação).
  const alert = useMemo(
    () =>
      visibleAlerts(alerts, privacyOf({ role, consent, breakGlass })).find(
        (a) => a.level === 'urgent' && a.ruleId === 'R-VIT-02' && !ack.includes(a.id),
      ),
    [alerts, role, consent, breakGlass, ack],
  )
  if (!alert) return null

  const reply = groundReplySec(environment)
  const close = () => {
    const next = [...ack, alert.id]
    setAck(next)
    setSent(false)
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* sem storage: fecha só nesta tela */
    }
  }
  const notify = () => {
    enqueuePacket(`URGENT: ${alert.title}. Crew member started the safe actions: re-measure, onboard medical checklist.`, 'priority')
    setSent(true)
  }
  const askOrbit = () => {
    close()
    useOrbitStore.getState().ask({ text: 'What should I do now?' }, { openDrawer: true })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        role="alertdialog"
        className="max-h-[90dvh] overflow-y-auto border-2 border-urgent max-md:max-w-[calc(100vw-1.5rem)]"
      >
        <DialogHeader className="space-y-2 text-left">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <OrbitMark size="sm" state="attention" decorative /> {ASSISTANT_NAME} · emergency
          </p>
          <StatusBadge status="urgent" />
          <DialogTitle className="text-2xl">This needs a person now</DialogTitle>
          <DialogDescription className="text-base text-foreground">{alert.title}.</DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-1.5 pl-5 text-base">
          {EMERGENCY_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        <p className="rounded-md bg-surface-2 p-3 text-sm">
          {reply === 0 ? (
            'Flight surgeon available now.'
          ) : (
            <>
              Ground reply in ~<span className="num">{formatShortDuration(reply)}</span>: the CMO onboard is your first
              contact. Do not wait for the ground.
            </>
          )}
        </p>
        <p className="text-xs text-muted">
          The rule engine marked this Urgent (illustrative thresholds). {ASSISTANT_NAME} does not diagnose or suggest
          treatment. Consult your flight surgeon.
        </p>

        {sent && (
          <p role="status" className="text-sm font-semibold">
            Sent · priority message queued for the CMO and the ground (demo).
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-start">
          {!sent && (
            <Button onClick={notify} className="max-md:h-11 max-md:w-full">
              Notify CMO now
            </Button>
          )}
          <Button variant="outline" onClick={askOrbit} className="max-md:h-11 max-md:w-full">
            Ask {ASSISTANT_NAME}
          </Button>
          <Button variant="ghost" onClick={close} className="max-md:h-11 max-md:w-full">
            {sent ? 'Close' : 'I am with the CMO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
