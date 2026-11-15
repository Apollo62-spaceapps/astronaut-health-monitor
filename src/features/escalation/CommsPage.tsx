// Comunicação e fila ao solo (K6 #46) — SPEC ESC-02, ESC-03, ESC-04, DEMO-02, ENV-05.
// O atraso faz parte da interface: o mesmo alerta tem resposta em ~40 min na Spacecraft e na hora na Earth.
import { RadioTower, Send } from 'lucide-react'
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import type { AlertLevel, OutboundPacket } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { escalate } from '@/features/escalation/escalateTemp'
import { usePacketProgress } from '@/features/escalation/usePacketProgress'

/** Texto do tempo de resposta do solo, em linguagem simples. */
export function replyText(sec: number): string {
  if (sec === 0) return 'Flight surgeon available now.'
  if (sec < 60) return `Ground reply in ~${sec.toFixed(1)} s.`
  return `Ground reply in ~${Math.round(sec / 60)} min. Follow these safe actions now.`
}

const fmt = (sec: number) => (sec < 60 ? `${sec.toFixed(1)} s` : `${Math.round(sec / 60)} min`)

const STATUS_TEXT: Record<OutboundPacket['status'], string> = {
  queued: 'Queued',
  sent: 'Sent — waiting for ground reply',
  'reply-received': 'Ground reply received',
}

const ACCELERATIONS = [1, 60, 600] as const

export function CommsPage() {
  usePacketProgress()
  const environment = useAppStore((s) => s.environment)
  const alerts = useAppStore((s) => s.alerts)
  const outbox = useAppStore((s) => s.outbox)
  const enqueuePacket = useAppStore((s) => s.enqueuePacket)
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const setTimeAcceleration = useAppStore((s) => s.setTimeAcceleration)

  const env = ENVIRONMENTS[environment]
  const eta = groundReplySec(environment)
  // Pior nível ativo (as regras do Lucas preenchem `alerts`; sem alertas = normal).
  const worst: AlertLevel = alerts.some((a) => a.level === 'urgent')
    ? 'urgent'
    : alerts.some((a) => a.level === 'attention')
      ? 'attention'
      : 'normal'
  const decision = escalate(worst, environment)

  const sendSummary = () => {
    const summary =
      alerts.length > 0
        ? alerts.map((a) => `[${a.level}] ${a.title}`).join(' · ')
        : `Daily summary — ${env.label}, no active alerts.`
    enqueuePacket(summary, decision.priority)
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="comms-title" className="rounded-lg bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Communications · {env.label}</p>
        <h1 id="comms-title" className="mt-1 flex items-center gap-2 text-3xl">
          <RadioTower aria-hidden className="size-7" />
          {replyText(eta)}
        </h1>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted">One-way delay</dt>
            <dd className="num text-lg">{fmt(env.oneWayDelaySec)}</dd>
          </div>
          <div>
            <dt className="text-muted">Ground reply (2 × delay)</dt>
            <dd className="num text-lg">{fmt(eta)}</dd>
          </div>
          <div>
            <dt className="text-muted">Current escalation</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={worst} />
              <span className="text-muted">
                {decision.escalateTo.length ? `→ notify ${decision.escalateTo.join(', ')}` : 'No escalation needed'}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">{env.delayNote}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {/* Secundário: o primário vermelho da tela é o "Log measurement" da faixa (ROUT-03, DESIGN-SYSTEM §3). */}
          <Button variant="secondary" onClick={sendSummary}>
            <Send aria-hidden />
            Send summary to ground
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted">
            Time acceleration (demo)
            <select
              value={acceleration}
              onChange={(e) => setTimeAcceleration(Number(e.target.value))}
              className="rounded border border-border bg-surface-2 px-2 py-1 text-foreground"
            >
              {ACCELERATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}×
                </option>
              ))}
            </select>
          </label>
          {acceleration > 1 && (
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted">
              Time-accelerated for demo
            </span>
          )}
        </div>
      </section>

      <section aria-labelledby="queue-title" className="rounded-lg bg-surface p-6">
        <h2 id="queue-title" className="text-xl">
          Store-and-forward queue
        </h2>
        {outbox.length === 0 ? (
          <p className="mt-2 text-muted">No packets yet. Summaries wait here until the link and the ground reply.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {[...outbox].reverse().map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-4 rounded-md bg-surface-2 p-3">
                <div>
                  <p className="font-semibold">
                    {p.priority === 'priority' && <span className="mr-2 text-urgent">● Priority</span>}
                    {STATUS_TEXT[p.status]}
                  </p>
                  <p className="text-sm text-muted">{p.summary}</p>
                </div>
                <div className="space-y-1 text-right text-sm">
                  <p>{ENVIRONMENTS[p.environment].label}</p>
                  <p className="num text-muted">ETA {fmt(p.etaGroundReplySec)}</p>
                  <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Simulated send — no real network' }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
