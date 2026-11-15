import { useState } from 'react'
import { Check, Circle, Clock3, Dumbbell, HeartPulse, Pause, Smile, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { DayLabel } from '@/components/DayLabel'
import { MeasurementDialog } from '@/features/routine/MeasurementDialog'
import { ENVIRONMENTS } from '@/domain/config/environments'
import type { RoutineItem, VitalReading } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { formatUtc, formatUtcTime, formatVitalValue } from '@/lib/format'

const STATUS: Record<RoutineItem['status'], { text: string; icon: typeof Circle }> = {
  due: { text: 'Due', icon: Circle },
  overdue: { text: 'Overdue', icon: Clock3 },
  done: { text: 'Done', icon: Check },
  postponed: { text: 'Postponed', icon: Pause },
}
// Mesmo ícone da aba Wellbeing (Smile) para o check-in de bem-estar.
const KIND_ICON = { measure: HeartPulse, checkin: Smile, exercise: Dumbbell, maintenance: Wrench }

/** Leitura mais recente de um vital até agora (qualquer dia). */
function latestReading(vitals: readonly VitalReading[], kind: VitalReading['kind'], nowIso: string) {
  const now = Date.parse(nowIso)
  return vitals
    .filter((r) => r.kind === kind && Date.parse(r.takenAt) <= now)
    .sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt))[0]
}

export function RoutinePage() {
  const environment = useAppStore((s) => s.environment)
  const role = useAppStore((s) => s.role)
  const routine = useAppStore((s) => s.routine)
  const vitals = useAppStore((s) => s.vitals)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const advanceDemoMinutes = useAppStore((s) => s.advanceDemoMinutes)
  const setTimeAcceleration = useAppStore((s) => s.setTimeAcceleration)
  const addReading = useAppStore((s) => s.addReading)
  const setRoutineStatus = useAppStore((s) => s.setRoutineStatus)
  const [selected, setSelected] = useState<RoutineItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const astronaut = role === 'ASTRONAUT'
  const items = routine
    .filter((item) => item.environments.includes(environment))
    .sort((a, b) => a.time.localeCompare(b.time))
  const today = simNowIso.slice(0, 10)
  const todayMeasurements = items.filter((item) => item.kind === 'measure')

  function save(item: RoutineItem, reading: VitalReading) {
    addReading(reading)
    setRoutineStatus(item.id, 'done')
    // O motor de regras recalcula status e alertas sozinho (useRulesEngineSync no App, L2 #53).
    setSelected(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <DayLabel extra={formatUtcTime(simNowIso)} />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Mission routine</h1>
          <p className="mt-2 text-muted">Today&apos;s scheduled activities for {ENVIRONMENTS[environment].label}.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
          <span className="mr-2 text-xs text-muted">
            Demo clock · {acceleration > 1 ? `${acceleration}×` : 'paused'}
          </span>
          <Button variant="outline" size="sm" onClick={() => advanceDemoMinutes(30)}>
            Advance 30 min
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeAcceleration(acceleration > 1 ? 1 : 60)}>
            {acceleration > 1 ? 'Pause demo' : 'Start demo'}
          </Button>
        </div>
      </div>
      {shelterActive && (
        <div role="status" className="rounded-md border-2 border-urgent bg-surface px-4 py-3 text-sm font-semibold">
          <span aria-hidden className="text-urgent">
            ●
          </span>{' '}
          Urgent · Radiation shelter active — items not yet done are postponed.
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Today&apos;s schedule
            <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Illustrative mission routine' }} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => {
            const StatusIcon = STATUS[item.status].icon
            const ActivityIcon = KIND_ICON[item.kind]
            const canLog =
              astronaut && item.kind === 'measure' && item.status !== 'done' && item.status !== 'postponed'
            return (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_88px_120px_170px] items-center gap-4 rounded-md border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <ActivityIcon aria-hidden className="size-4 shrink-0 text-muted" />
                  <p className="font-medium">{item.title}</p>
                </div>
                <span className="num text-sm">{item.time} UTC</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <StatusIcon aria-hidden className="size-4" />
                  {STATUS[item.status].text}
                </span>
                <span className="flex justify-end">
                  {canLog && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(item)
                        setDialogOpen(true)
                      }}
                    >
                      Log measurement
                    </Button>
                  )}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s measurements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1.4fr_0.6fr] gap-3 text-sm font-semibold text-muted">
            <span>Measurement</span>
            <span>Latest reading</span>
            <span>Status</span>
          </div>
          <div className="mt-2 divide-y divide-border">
            {todayMeasurements.map((item) => {
              const reading = item.vital ? latestReading(vitals, item.vital, simNowIso) : undefined
              const isToday = reading?.takenAt.slice(0, 10) === today
              // Pressão: sistólica/diastólica da mesma medição ("121/79 mmHg").
              const diastolic =
                item.vital === 'systolicBP' && reading
                  ? vitals.find((r) => r.kind === 'diastolicBP' && r.takenAt === reading.takenAt)
                  : undefined
              // Leitura de hoje = feito; leitura antiga mostra o horário dela e o status da rotina.
              const status = isToday && item.status !== 'postponed' ? 'done' : item.status
              const s = STATUS[status]
              const Icon = s.icon
              return (
                <div key={item.id} className="grid grid-cols-[1fr_1.4fr_0.6fr] items-center gap-3 py-3">
                  <span>{item.title}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    {reading ? (
                      <>
                        <span className="num">
                          {diastolic
                            ? `${formatVitalValue('systolicBP', reading.value)}/${formatVitalValue('diastolicBP', diastolic.value)}`
                            : formatVitalValue(reading.kind, reading.value)}{' '}
                          {reading.unit}
                        </span>
                        <span className="num text-xs text-muted">
                          {isToday ? `today, ${formatUtcTime(reading.takenAt)}` : formatUtc(reading.takenAt)}
                        </span>
                        <ProvenanceBadge provenance={reading.provenance} />
                      </>
                    ) : (
                      <span className="text-muted">No reading yet</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 text-muted">
                    <Icon aria-hidden className="size-4" />
                    {s.text}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Input plausibility only · Consult your flight surgeon.</p>
        </CardContent>
      </Card>
      {astronaut && (
        <MeasurementDialog
          item={selected}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          nowIso={simNowIso}
          onSave={save}
        />
      )}
    </div>
  )
}
