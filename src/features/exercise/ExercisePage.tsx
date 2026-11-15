import { useMemo } from 'react'
import { Check, Dumbbell, Flame, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { SourceRef } from '@/components/SourceRef'
import { useAppStore } from '@/state/store'
import { applyShelter, streakDays, weeklyAdherence } from '@/domain/rules/exercise'

export function ExercisePage() {
  const sessions = useAppStore((s) => s.exercise)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const loadScenario = useAppStore((s) => s.loadScenario)
  const today = simNowIso.slice(0, 10)
  const todaySessions = sessions.filter((session) => session.date === today)
  const totalToday = todaySessions.reduce((sum, session) => sum + session.doneMin, 0)
  const dayTarget = todaySessions.reduce((sum, session) => sum + session.prescribedMin, 0)
  const progressPct = dayTarget > 0 ? Math.min(100, Math.round((totalToday / dayTarget) * 100)) : 0
  const adherence = weeklyAdherence(applyShelter(sessions, simNowIso, shelterActive), simNowIso)
  const streak = streakDays(sessions, today)
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${today}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - (6 - i))
    return date.toISOString().slice(0, 10)
  }), [today])

  function logMinutes(minutes: number) {
    const existing = todaySessions[0]
    if (!existing) return
    const next = sessions.map((session) => session.date === today
      ? { ...session, doneMin: minutes, status: minutes >= session.prescribedMin ? 'done' as const : minutes > 0 ? 'partial' as const : 'skipped' as const }
      : session)
    loadScenario({ exercise: next })
  }

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Exercise · self-reported</p>
      <h1 className="mt-2 text-3xl">Training time</h1>
      <p className="mt-2 text-muted">Record your total exercise time. This monitor does not prescribe or change your training plan.</p>
    </header>

    {shelterActive && <p role="status" className="rounded-md bg-surface px-4 py-3 text-muted">Radiation shelter active · exercise is postponed for this scenario.</p>}

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell aria-hidden className="size-5" />Today</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <span className="num text-4xl">{totalToday}</span><span className="text-muted">min recorded</span>
          <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Self-reported scenario data.' }} />
        </div>
        <div aria-label={`Daily exercise progress ${progressPct}%`} className="h-2 overflow-hidden rounded-sm bg-surface-2"><div className="h-full bg-link" style={{ width: `${progressPct}%` }} /></div>
        <p className="text-sm text-muted">Reference: about 2 h/day on the ISS, on average <SourceRef ids={['S13','S21']} />. This is context, not an individual target.</p>
        {!shelterActive && todaySessions.length > 0 && <div className="flex flex-wrap items-end gap-3">
          <Label htmlFor="exercise-minutes">Total minutes</Label><Input id="exercise-minutes" type="number" min="0" max="240" defaultValue={totalToday || ''} className="w-28 font-mono" onBlur={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0 && n <= 240) logMinutes(n) }} />
          <Button variant="outline" onClick={() => logMinutes(dayTarget)}><Check aria-hidden />Save check-in</Button>
        </div>}
        <p className="text-xs text-muted">Self-report, not a clinical assessment. Consult your flight surgeon.</p>
      </CardContent>
    </Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Weekly activity</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex items-center gap-3"><span className="num text-4xl">{adherence.pct === null ? '—' : `${adherence.pct.toFixed(0)}%`}</span><span className="text-muted">of recorded weekly plan</span><ProvenanceBadge provenance={{ kind: 'simulated', note: 'Calculated from self-reported exercise time.' }} /></div>
        <div className="grid grid-cols-7 gap-2" aria-label="Exercise minutes over the last 7 days">{weekDays.map((date) => {
          const mins = sessions.filter((s) => s.date === date).reduce((sum, s) => sum + s.doneMin, 0)
          return <div key={date} className="text-center"><div className="flex h-20 items-end rounded-sm bg-surface-2"><div className="w-full rounded-sm bg-link" style={{ height: `${Math.min(100, mins / 120 * 100)}%` }} /></div><span className="num text-xs">{mins}</span></div>
        })}</div><p className="text-xs text-muted">Minutes per day · SIMULATED</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Mission readiness</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="flex items-center gap-2"><Flame aria-hidden className="size-4" /><span className="num">{streak}</span> day streak <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Based on self-reported exercise check-ins.' }} /></p>
        <div className="space-y-2 text-sm text-muted"><p className="flex items-center gap-2"><Trophy aria-hidden className="size-4" />First check-in {sessions.some((s) => s.doneMin > 0) ? '· achieved' : '· in progress'}</p><p className="flex items-center gap-2"><Trophy aria-hidden className="size-4" />7-day streak {streak >= 7 ? '· achieved' : '· in progress'}</p><p className="flex items-center gap-2"><Trophy aria-hidden className="size-4" />60 min in one day {sessions.some((s) => s.doneMin >= 60) ? '· achieved' : '· in progress'}</p></div>
      </CardContent></Card>
    </div>
    <p className="text-xs text-muted">NASA ISS reference average: about 2 h/day. It is not an individual prescription. <SourceRef ids={['S13','S21']} /></p>
  </div>
}
