import { useMemo } from 'react'
import { Check, Dumbbell, Pause, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { SourceRef } from '@/components/SourceRef'
import { useAppStore } from '@/state/store'
import { applyShelter, weeklyAdherence } from '@/domain/rules/exercise'
import { ENVIRONMENTS } from '@/domain/config/environments'
import type { ExerciseSession } from '@/domain/types'

const DEVICES = ['ARED', 'T2', 'CEVIS'] as const
const DEVICE_NAMES = {
  ARED: 'Advanced Resistive Exercise Device',
  T2: 'Treadmill 2',
  CEVIS: 'Cycle Ergometer with Vibration Isolation System',
}
// Fora da Space Station não há fonte para os aparelhos (P-18): mostra só o tipo de sessão.
const SESSION_KIND = { ARED: 'Resistance session', T2: 'Treadmill session', CEVIS: 'Cycle session' }

export function ExercisePage() {
  const sessions = useAppStore((s) => s.exercise)
  const environment = useAppStore((s) => s.environment)
  const env = ENVIRONMENTS[environment]
  // §5.1: só a Space Station tem equipamentos com fonte [S13]; Earth = plano de solo; Moon/Spacecraft = P-18.
  const sourcedDevices = env.exerciseDevices !== null
  const equipmentNote = sourcedDevices ? (
    <>
      {env.label} equipment: ARED, T2 and CEVIS, about 2 h of exercise per day on average <SourceRef ids={['S13']} />.
    </>
  ) : environment === 'EARTH' ? (
    'Earth: ground training plan (simulated).'
  ) : (
    `${env.label}: simulated habitat equipment (no published source for this environment).`
  )
  const simNowIso = useAppStore((s) => s.simNowIso)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const loadScenario = useAppStore((s) => s.loadScenario)
  const today = simNowIso.slice(0, 10)
  const todaySessions = sessions.filter((session) => session.date === today)
  const displayedToday = useMemo(
    () => applyShelter(todaySessions, simNowIso, shelterActive),
    [todaySessions, simNowIso, shelterActive],
  )
  // Mesma conta do motor (Overview): sessões adiadas pelo abrigo ficam fora (R-EX-01 + R-EX-02).
  const adherence = weeklyAdherence(applyShelter(sessions, simNowIso, shelterActive), simNowIso)
  const plannedMin = todaySessions.reduce((sum, s) => sum + s.prescribedMin, 0)

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
    <div className="space-y-6">
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
            Sessions · <span className="num">{plannedMin}</span> min planned
            <ProvenanceBadge
              provenance={
                sourcedDevices
                  ? {
                      kind: 'simulated',
                      basis: 'S13',
                      note: 'Illustrative scenario plan based on ISS exercise equipment.',
                    }
                  : { kind: 'simulated', note: 'Illustrative scenario plan; equipment not sourced.' }
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">Plan from the ASCR team (simulated).</p>
          <p className="text-sm">{equipmentNote}</p>
          {DEVICES.map((device) => {
            const session = displayedToday.find((item) => item.device === device)
            if (!session)
              return (
                <div key={device} className="rounded-md border border-border bg-surface-2 p-4">
                  <p className="font-semibold">
                    {sourcedDevices ? `${device} · ${DEVICE_NAMES[device]}` : SESSION_KIND[device]}
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
                  <h2 className="font-semibold">{sourcedDevices ? device : SESSION_KIND[device]}</h2>
                  <p className="text-sm text-muted">
                    {sourcedDevices
                      ? DEVICE_NAMES[device]
                      : environment === 'EARTH'
                        ? 'Ground training'
                        : 'Simulated habitat equipment'}
                  </p>
                  {session.status !== 'postponed' && (
                    <p className="mt-1 text-xs text-muted">
                      {session.status === 'done'
                        ? 'Done · self-reported'
                        : session.status === 'partial'
                          ? `Partial · ${session.doneMin} min · self-reported`
                          : 'Skipped · self-reported'}
                    </p>
                  )}
                </div>
                <p className="num text-sm">{session.prescribedMin} min</p>
                {session.status === 'postponed' ? (
                  <span className="flex items-center justify-end gap-2 text-muted">
                    <Pause aria-hidden className="size-4" />
                    Postponed · shelter active
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
                <span className="num">{adherence.prescribedMin}</span> min · last 7 days
              </span>
              <ProvenanceBadge
                provenance={{ kind: 'simulated', note: 'Calculated from self-reported session check-ins.' }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
