// Comunicação e fila ao solo (K6 #46) — SPEC ESC-02, ESC-03, ESC-04, DEMO-02, ENV-05.
// O atraso faz parte da interface: o mesmo alerta tem resposta em ~40 min na Spacecraft e na hora na Earth.
import { ArrowRight, RadioTower, Send, WifiOff } from 'lucide-react'
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import type { AlertLevel, OutboundPacket, Role } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { SourceRef } from '@/components/SourceRef'
import { escalate } from '@/features/escalation/escalateTemp'
import { usePacketProgress } from '@/features/escalation/usePacketProgress'
import { BLACKOUT_NOTE, blackoutPossible, isBlackoutActive } from '@/features/escalation/blackout'
import { Switch } from '@/components/ui/switch'
import { formatShortDuration, formatUtc } from '@/lib/format'

/** Texto do tempo de resposta do solo, em linguagem simples. */
export function replyText(sec: number, blackout = false): string {
  if (blackout) return 'Comm blackout — no ground link. Follow these safe actions now.'
  if (sec === 0) return 'Flight surgeon available now.'
  if (sec < 60) return `Ground reply in ~${sec.toFixed(1)} s.`
  return `Ground reply in ~${Math.round(sec / 60)} min. Follow these safe actions now.`
}

/** Nome legível do destinatário (nunca o enum cru). */
export const RECIPIENT: Record<Role, string> = { CMO: 'CMO', FLIGHT_SURGEON: 'flight surgeon', ASTRONAUT: 'astronaut' }

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
  const simNowIso = useAppStore((s) => s.simNowIso)
  const enqueuePacket = useAppStore((s) => s.enqueuePacket)
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const setTimeAcceleration = useAppStore((s) => s.setTimeAcceleration)
  const commBlackout = useAppStore((s) => s.commBlackout)
  const setCommBlackout = useAppStore((s) => s.setCommBlackout)
  const blackout = isBlackoutActive(environment, commBlackout)

  const env = ENVIRONMENTS[environment]
  const eta = groundReplySec(environment)
  // Pior nível ativo (as regras preenchem `alerts`; sem alertas = normal).
  const worst: AlertLevel = alerts.some((a) => a.level === 'urgent')
    ? 'urgent'
    : alerts.some((a) => a.level === 'attention')
      ? 'attention'
      : 'normal'
  const decision = escalate(worst, environment)
  const summary =
    alerts.length > 0
      ? alerts.map((a) => `[${a.level}] ${a.title}`).join(' · ')
      : `Daily summary — ${env.label}, no active alerts.`

  return (
    <div className="space-y-6">
      <section aria-labelledby="comms-title" className="rounded-lg bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Communications · {env.label}</p>
        <h1 id="comms-title" className="mt-1 flex items-center gap-2 text-3xl">
          {blackout ? <WifiOff aria-hidden className="size-7" /> : <RadioTower aria-hidden className="size-7" />}
          {replyText(eta, blackout)}
        </h1>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted">One-way delay</dt>
            <dd className="num text-lg">{formatShortDuration(env.oneWayDelaySec)}</dd>
          </div>
          <div>
            <dt className="text-muted">Ground reply (2 × delay)</dt>
            <dd className="num text-lg">{formatShortDuration(eta)}</dd>
          </div>
          <div>
            <dt className="text-muted">Current escalation</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={worst} />
              <span className="text-muted">
                {decision.escalateTo.length
                  ? `→ notify ${decision.escalateTo.map((r) => RECIPIENT[r]).join(' and ')}`
                  : 'No escalation needed'}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted">
          {environment === 'SPACECRAFT' ? (
            <>
              20 min one way in this scenario. NASA cites Earth–Mars delays of 4–24 min <SourceRef ids={['S10']} /> and up
              to about 22 min <SourceRef ids={['S20']} />.
            </>
          ) : (
            env.delayNote
          )}
        </p>
        {blackoutPossible(environment) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-surface-2 p-3 text-sm">
            <Switch
              id="comm-blackout"
              className="data-[state=checked]:bg-link"
              checked={commBlackout}
              onCheckedChange={setCommBlackout}
            />
            <label htmlFor="comm-blackout" className="font-semibold">
              Comm blackout · demo
            </label>
            <span className="text-muted">
              {blackout ? 'Packets stay queued until the blackout ends.' : BLACKOUT_NOTE}
            </span>
            <SourceRef ids={['S10', 'S11']} />
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {/* Secundário: o primário vermelho de cada tela é outro (DESIGN-SYSTEM §3). */}
          <Button variant="secondary" onClick={() => enqueuePacket(summary, decision.priority)}>
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="preview-title" className="rounded-lg bg-surface p-6">
          <h2 id="preview-title" className="text-xl">
            Next packet preview
          </h2>
          <p className="mt-1 text-sm text-muted">What &quot;Send summary to ground&quot; would queue right now.</p>
          <dl className="mt-4 space-y-2 rounded-md bg-surface-2 p-4 text-sm">
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-muted">Created</dt>
              <dd className="num">{formatUtc(simNowIso)}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-muted">From</dt>
              <dd>{env.label}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-muted">Priority</dt>
              <dd>{decision.priority === 'priority' ? '● Priority' : 'Normal'}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-muted">Summary</dt>
              <dd>{summary}</dd>
            </div>
          </dl>
          {/* Linha do tempo do store-and-forward (ESC-04): sai → chega ao solo → resposta volta. */}
          <ol aria-label="Packet timeline" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <li className="rounded bg-surface-2 px-2 py-1">Sent · now</li>
            <ArrowRight aria-hidden className="size-4 text-muted" />
            <li className="rounded bg-surface-2 px-2 py-1">
              Arrives at ground · <span className="num">+{formatShortDuration(env.oneWayDelaySec)}</span>
            </li>
            <ArrowRight aria-hidden className="size-4 text-muted" />
            <li className="rounded bg-surface-2 px-2 py-1">
              Reply back · <span className="num">+{formatShortDuration(eta)}</span>
            </li>
          </ol>
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
                      {blackout && p.status === 'queued' ? 'Queued — held until the blackout ends' : STATUS_TEXT[p.status]}
                    </p>
                    <p className="text-sm text-muted">{p.summary}</p>
                  </div>
                  <div className="space-y-1 text-right text-sm">
                    <p>{ENVIRONMENTS[p.environment].label}</p>
                    <p className="num text-muted">Reply {formatShortDuration(p.etaGroundReplySec)}</p>
                    <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Simulated send — no real network' }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
