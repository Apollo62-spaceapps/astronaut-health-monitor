import { useState } from 'react'
import { Check, Circle, Clock3, Dumbbell, HeartPulse, Pause, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { MeasurementDialog } from '@/features/routine/MeasurementDialog'
import { ENVIRONMENTS } from '@/domain/config/environments'
import type { RoutineItem, VitalReading } from '@/domain/types'
import { useAppStore } from '@/state/store'

const STATUS: Record<RoutineItem['status'], { text: string; icon: typeof Circle }> = {
  due: { text: 'Due', icon: Circle },
  overdue: { text: 'Overdue', icon: Clock3 },
  done: { text: 'Done', icon: Check },
  postponed: { text: 'Postponed', icon: Pause },
}
const KIND_ICON = { measure: HeartPulse, checkin: Circle, exercise: Dumbbell, maintenance: Wrench }

export function RoutinePage() {
  const environment = useAppStore((s) => s.environment)
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
  const items = routine
    .filter((item) => item.environments.includes(environment))
    .sort((a, b) => a.time.localeCompare(b.time))
  const today = simNowIso.slice(0, 10)
  const todayMeasurements = items.filter((item) => item.kind === 'measure')
  const todayReadings = vitals.filter((reading) => reading.takenAt.slice(0, 10) === today)

  function save(item: RoutineItem, reading: VitalReading) {
    addReading(reading)
    setRoutineStatus(item.id, 'done')
    // O motor de regras recalcula status e alertas sozinho (useRulesEngineSync no App, L2 #53).
    setSelected(null)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Mission day · {simNowIso.slice(0, 10)} · SIMULATED
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Mission routine</h1>
          <p className="mt-2 text-muted">Today's scheduled activities for {ENVIRONMENTS[environment].label}.</p>
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
        <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
          Radiation shelter active · non-completed routine items are postponed.
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Today's schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => {
            const StatusIcon = STATUS[item.status].icon
            const ActivityIcon = KIND_ICON[item.kind]
            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_88px_130px_100px] items-center gap-4 rounded-md border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <ActivityIcon aria-hidden className="size-4 text-muted" />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <ProvenanceBadge provenance={item.provenance} />
                  </div>
                </div>
                <span className="font-mono tabular-nums text-sm">{item.time}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <StatusIcon aria-hidden className="size-4" />
                  {STATUS[item.status].text}
                </span>
                {item.kind === 'measure' && item.status !== 'done' && item.status !== 'postponed' ? (
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
                ) : (
                  <span />
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Today's measurements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 text-sm font-semibold text-muted">
            <span>Measurement</span>
            <span>Latest reading</span>
            <span>Status</span>
          </div>
          <div className="mt-2 divide-y divide-border">
            {todayMeasurements.map((item) => {
              const reading = [...todayReadings].reverse().find((r) => r.kind === item.vital)
              const s = STATUS[item.status]
              const Icon = s.icon
              return (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 py-3">
                  <span>{item.title}</span>
                  <span className="font-mono tabular-nums">
                    {reading ? `${reading.value} ${reading.unit}` : '—'}
                    {reading && (
                      <span className="ml-2">
                        <ProvenanceBadge provenance={reading.provenance} />
                      </span>
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
      <MeasurementDialog
        item={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nowIso={simNowIso}
        onSave={save}
      />
    </div>
  )
}
