// Faixa da missão (K4 #44) — DESIGN-SYSTEM §4/§7. A cor vem de --color-banner, que muda com o
// modo de ambiente (data-environment). O botão de modo de ambiente (K5) entra no `envSlot`.
// O tempo de resposta do solo é texto estático ("Ground reply ≈ 40 min (2 × 20 min delay)"); uma contagem
// regressiva só aparece quando há um pacote enviado esperando resposta (ESC-04).
import { useState, type ReactNode } from 'react'
import { Clock3 } from 'lucide-react'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { MeasurementDialog } from '@/features/routine/MeasurementDialog'
import { useOrbitStore } from '@/features/assistant/orbitStore'

/** Divide segundos em horas, minutos e segundos. */
export function splitHms(totalSec: number) {
  const s = Math.round(totalSec)
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}
export function MissionBanner({ envSlot }: { envSlot?: ReactNode }) {
  const role = useAppStore((s) => s.role)
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
    <div role="region" aria-label="Mission banner" className="bg-banner px-4 py-2 transition-colors md:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {envSlot}


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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md bg-black/20 px-2 py-1" role="status">
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
              {/* L7 §9.4: o mesmo lembrete pode ser pedido ao Orbit. */}
              <button
                type="button"
                className="cursor-pointer text-sm text-white underline-offset-2 hover:underline"
                onClick={() =>
                  useOrbitStore.getState().ask({ text: 'Remind me of my measurements', intent: 'routine' }, { openDrawer: true })
                }
              >
                Ask Orbit
              </button>
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
