// Faixa da missão (K4 #44) — DESIGN-SYSTEM §4/§7. A cor vem de --color-banner, que muda com o
// modo de ambiente (data-environment). O botão de modo de ambiente (K5) entra no `envSlot`.
// O tempo de resposta do solo é texto estático ("Ground reply ≈ 40 min (2 × 20 min delay)"); uma contagem
// regressiva só aparece quando há um pacote enviado esperando resposta (ESC-04).
import { useEffect, useState, type ReactNode } from 'react'
import { Clock3 } from 'lucide-react'
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import type { Role } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { isBlackoutActive } from '@/features/escalation/blackout'
import { Button } from '@/components/ui/button'
import { MeasurementDialog } from '@/features/routine/MeasurementDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatShortDuration } from '@/lib/format'

export const ROLE_LABEL: Record<Role, string> = {
  ASTRONAUT: 'Astronaut',
  CMO: 'CMO',
  FLIGHT_SURGEON: 'Flight surgeon',
}

/** Divide segundos em horas, minutos e segundos. */
export function splitHms(totalSec: number) {
  const s = Math.round(totalSec)
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}
const pad = (n: number) => String(n).padStart(2, '0')

/** "Ground reply ≈ 40 min (2 × 20 min delay)" — texto estático, nunca um cronômetro parado. */
export function groundReplyText(oneWaySec: number): string {
  if (oneWaySec === 0) return 'Ground reply ≈ 0 s (near real time)'
  return `Ground reply ≈ ${formatShortDuration(2 * oneWaySec)} (2 × ${formatShortDuration(oneWaySec)} delay)`
}

/**
 * Contagem regressiva real de um pacote já enviado (ESC-04). Começa quando o pacote aparece como "sent"
 * (o componente é montado com key = id do pacote) e anda com o relógio da página × a aceleração da demo.
 */
function PacketCountdown({ etaSec }: { etaSec: number }) {
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const remaining = Math.max(0, etaSec - ((now - start) / 1000) * acceleration)
  const { h, m, s } = splitHms(remaining)
  return (
    <span role="timer" className="rounded bg-black/25 px-2 py-0.5">
      Packet reply in{' '}
      <span className="num font-semibold">
        {h > 0 ? `${pad(h)}:` : ''}
        {pad(m)}:{pad(s)}
      </span>
      {acceleration > 1 && <span className="text-white/85"> · time-accelerated for demo</span>}
    </span>
  )
}

export function GroundReplyWindow() {
  const environment = useAppStore((st) => st.environment)
  const env = ENVIRONMENTS[environment]
  const blackout = useAppStore((st) => isBlackoutActive(st.environment, st.commBlackout))
  const inFlight = useAppStore((st) => [...st.outbox].reverse().find((p) => p.status === 'sent'))
  if (blackout) {
    return <p className="text-sm font-semibold">Comm blackout · {env.label} · no ground link (demo)</p>
  }
  if (environment === 'EARTH') {
    return <p className="text-sm font-semibold">Flight surgeon available now</p>
  }
  const total = groundReplySec(environment)
  return (
    <div aria-label={`Ground reply window, ${env.label}`} className="flex flex-wrap items-baseline gap-x-3 text-sm">
      <span className="font-semibold">{groundReplyText(env.oneWayDelaySec)}</span>
      {inFlight && total >= 60 && <PacketCountdown key={inFlight.id} etaSec={inFlight.etaGroundReplySec} />}
    </div>
  )
}

export function MissionBanner({ envSlot }: { envSlot?: ReactNode }) {
  const role = useAppStore((s) => s.role)
  const setRole = useAppStore((s) => s.setRole)
  const aiMode = useAppStore((s) => s.aiMode)
  const routine = useAppStore((s) => s.routine)
  const environment = useAppStore((s) => s.environment)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const addReading = useAppStore((s) => s.addReading)
  const setRoutineStatus = useAppStore((s) => s.setRoutineStatus)
  const [logItemId, setLogItemId] = useState<string | null>(null)
  // Só lembra itens da rotina do ambiente atual (ROUT-01/03), e só ao astronauta (quem mede).
  const reminder =
    role === 'ASTRONAUT'
      ? routine.find(
          (item) =>
            item.kind === 'measure' &&
            item.environments.includes(environment) &&
            (item.status === 'overdue' || item.status === 'due'),
        )
      : undefined
  const logItem = routine.find((item) => item.id === logItemId) ?? reminder ?? null

  return (
    <div role="region" aria-label="Mission banner" className="bg-banner px-6 py-2 transition-colors">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {envSlot}

        <label className="flex items-center gap-2 text-sm">
          <span className="text-white/85">Role:</span>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger aria-label="Role" className="h-8 w-40 border-white/30 bg-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <span className="rounded bg-black/25 px-2 py-1 text-sm" aria-label="AI mode">
          AI: {aiMode === 'onboard-model' ? 'onboard model' : 'protocol mode'}
        </span>

        <div className="ml-auto">
          <GroundReplyWindow />
        </div>
      </div>
      {/* Segunda linha só quando há algo a dizer (lembrete ou abrigo): o dia já aparece no topo de cada tela. */}
      {(shelterActive || reminder) && (
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {shelterActive ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md border-2 border-urgent bg-black/40 px-2 py-0.5 text-sm font-semibold text-white"
          >
            <span aria-hidden className="text-urgent">
              ●
            </span>
            Urgent · Radiation shelter active — routine items postponed · demo
          </p>
        ) : (
          reminder && (
            <div className="flex items-center gap-3 rounded-md bg-black/20 px-2 py-0.5" role="status">
              <Clock3 aria-hidden className="size-4" />
              <span className="text-sm">
                Time to measure your{' '}
                {reminder.vital === 'heartRate'
                  ? 'resting heart rate'
                  : reminder.title.toLowerCase().replace('measure ', '')}
                {reminder.status === 'overdue' ? ' · overdue' : ''}
              </span>
              <span className="rounded border border-white/30 px-1.5 text-[11px] uppercase tracking-wider">Demo</span>
              <Button size="sm" className="h-7" onClick={() => setLogItemId(reminder.id)}>
                Log measurement
              </Button>
            </div>
          )
        )}
      </div>
      )}
      <MeasurementDialog
        item={logItem}
        open={!!logItemId}
        onOpenChange={(open) => {
          if (!open) setLogItemId(null)
        }}
        nowIso={simNowIso}
        onSave={(item, reading) => {
          addReading(reading)
          setRoutineStatus(item.id, 'done')
          // O motor de regras recalcula status e alertas sozinho (useRulesEngineSync no App, L2 #53).
          setLogItemId(null)
        }}
      />
    </div>
  )
}
