import { useMemo } from 'react'
import { Check, Dumbbell, Pause, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { useAppStore } from '@/state/store'
import { applyShelter, weeklyAdherence } from '@/domain/rules/exercise'
import type { ExerciseSession } from '@/domain/types'

const DEVICES = ['ARED', 'T2', 'CEVIS'] as const
const DEVICE_NAMES = {
  ARED: 'Advanced Resistive Exercise Device',
  T2: 'Treadmill 2',
  CEVIS: 'Cycle Ergometer with Vibration Isolation System',
}

export function ExercisePage() {
  const sessions = useAppStore((s) => s.exercise)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const loadScenario = useAppStore((s) => s.loadScenario)
  const today = simNowIso.slice(0, 10)
  const todaySessions = sessions.filter((session) => session.date === today)
  const displayedToday = useMemo(
    () => applyShelter(todaySessions, simNowIso, shelterActive),
    [todaySessions, simNowIso, shelterActive],
  )
  const adherence = weeklyAdherence(sessions, simNowIso)

  function updateSession(device: ExerciseSession['device'], status: ExerciseSession['status'], doneMin: number) {
    const next = sessions.map((session) =>
      session.date === today && session.device === device
        ? {
            ...session,
            status,
            doneMin,
            ...(status === 'postponed' ? { reason: 'shelter active' } : { reason: undefined }),
          }
        : session,
    )
    loadScenario({ exercise: next })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Exercise · self-reported</p>
        <h1 className="mt-2 text-3xl">Today's plan</h1>
        <p className="mt-2 text-muted">
          Sessions shown as the current scenario plan. The app does not prescribe or change it.
        </p>
      </header>

      {shelterActive && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-muted"
        >
          <Pause aria-hidden className="size-4" />
          Radiation shelter active · today's sessions are postponed.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell aria-hidden className="size-5" />
            Sessions · 120 min planned · SIMULATED
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">Prescribed by ASCR team (simulated).</p>
          <ProvenanceBadge
            provenance={{
              kind: 'simulated',
              basis: 'S13',
              note: 'Illustrative scenario plan based on ISS exercise equipment.',
            }}
          />
          {DEVICES.map((device) => {
            const session = displayedToday.find((item) => item.device === device)
            if (!session)
              return (
                <div key={device} className="rounded-md border border-border bg-surface-2 p-4">
                  <p className="font-semibold">
                    {device} · {DEVICE_NAMES[device]}
                  </p>
                  <p className="mt-2 text-sm text-muted">No session scheduled for this environment today.</p>
                </div>
              )
            return (
              <section
                key={device}
                className="grid grid-cols-[1fr_110px_230px] items-center gap-4 rounded-md border border-border bg-surface-2 p-4"
              >
                <div>
                  <h2 className="font-semibold">{device}</h2>
                  <p className="text-sm text-muted">{DEVICE_NAMES[device]}</p>
                  <p className="mt-1 text-xs text-muted">
                    {session.status === 'postponed'
                      ? 'Postponed · shelter active'
                      : session.status === 'done'
                        ? 'Done · self-reported'
                        : session.status === 'partial'
                          ? 'Partial · self-reported'
                          : 'Skipped · self-reported'}
                  </p>
                </div>
                <p className="num text-sm">
                  {session.prescribedMin} min <span className="text-muted">SIMULATED</span>
                </p>
                {shelterActive ? (
                  <span className="flex items-center gap-2 text-muted">
                    <Pause aria-hidden className="size-4" />
                    Postponed
                  </span>
                ) : (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Mark ${device} done`}
                      onClick={() => updateSession(device, 'done', session.prescribedMin)}
                    >
                      <Check aria-hidden />
                      Done
                    </Button>
                    <label className="flex items-center gap-1">
                      <Label htmlFor={`partial-${device}`} className="sr-only">
                        Minutes completed on {device}
                      </Label>
                      <Input
                        id={`partial-${device}`}
                        type="number"
                        min="0"
                        max={session.prescribedMin}
                        defaultValue={session.status === 'partial' ? session.doneMin : ''}
                        className="h-8 w-16 font-mono"
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          if (value > 0 && value < session.prescribedMin) updateSession(device, 'partial', value)
                        }}
                      />
                      <span className="text-xs text-muted">min</span>
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Mark ${device} skipped`}
                      onClick={() => updateSession(device, 'skipped', 0)}
                    >
                      <SkipForward aria-hidden />
                      Skip
                    </Button>
                  </div>
                )}
              </section>
            )
          })}
          <p className="text-xs text-muted">Check-ins are self-reported. Consult your flight surgeon.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly adherence</CardTitle>
        </CardHeader>
        <CardContent className="flex items-baseline gap-3">
          {adherence.pct === null ? (
            <p className="text-muted">No prescribed sessions in this 7-day window.</p>
          ) : (
            <>
              <span className="num text-4xl">{adherence.pct.toFixed(0)}%</span>
              <span className="text-muted">
                <span className="num">{adherence.doneMin}</span> of{' '}
                <span className="num">{adherence.prescribedMin}</span> min · last 7 days · SIMULATED
              </span>
              <ProvenanceBadge
                provenance={{ kind: 'simulated', note: 'Calculated from self-reported session check-ins.' }}
              />
            </>
          )}
          <span className="sr-only">Calculated by R-EX-01.</span>
        </CardContent>
      </Card>
    </div>
  )
}
