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
  const todaySessions = sessions.filter((s) => s.date === today)
  const planned = todaySessions.reduce((sum, s) => sum + s.prescribedMin, 0)
  const completed = todaySessions.reduce((sum, s) => sum + s.doneMin, 0)
  const progress = planned ? Math.min(100, Math.round(completed / planned * 100)) : 0
  const adherence = weeklyAdherence(applyShelter(sessions, simNowIso, shelterActive), simNowIso)
  const streak = streakDays(sessions, today)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 6 + i); return d.toISOString().slice(0, 10)
  }), [today])
  function saveMinutes(value: number) {
    const next = sessions.map((s) => s.date !== today ? s : { ...s, doneMin: value, status: value >= s.prescribedMin ? 'done' as const : value > 0 ? 'partial' as const : 'skipped' as const })
    loadScenario({ exercise: next })
  }
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-muted">Exercise · self-reported</p><h1 className="mt-2 text-3xl">Training time</h1><p className="mt-2 text-muted">Log total exercise minutes. This monitor does not prescribe or change your training.</p></header>
    {shelterActive && <p role="status" className="rounded-md bg-surface px-4 py-3 text-muted">Radiation shelter active · exercise is postponed in this scenario.</p>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell aria-hidden className="size-5" />Today’s activity</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="flex items-baseline gap-2"><span className="num text-4xl">{completed}</span><span className="text-muted">minutes logged</span><ProvenanceBadge provenance={{ kind: 'simulated', note: 'Self-reported demo data.' }} /></p>
      <div aria-label={`Daily progress ${progress}%`} className="h-2 overflow-hidden rounded-sm bg-surface-2"><div className="h-full bg-link" style={{ width: `${progress}%` }} /></div>
      <p className="text-sm text-muted">NASA reports about 2 hours of exercise per day on the ISS, on average. Reference only; not an individual target. <SourceRef ids={['S13','S21']} /></p>
      {!shelterActive && todaySessions.length > 0 && <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); const v = Number(new FormData(e.currentTarget).get('minutes')); if (Number.isFinite(v) && v >= 0 && v <= 240) saveMinutes(v) }}><div className="space-y-1"><Label htmlFor="exercise-minutes">Total minutes today</Label><Input id="exercise-minutes" name="minutes" type="number" min="0" max="240" defaultValue={completed || ''} className="w-32 font-mono" /></div><Button type="submit" variant="outline"><Check aria-hidden />Save check-in</Button></form>}
      <p className="text-xs text-muted">Self-report, not a clinical assessment. Consult your flight surgeon.</p>
    </CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Weekly activity</CardTitle></CardHeader><CardContent className="space-y-3"><p><span className="num text-4xl">{adherence.pct === null ? '—' : `${adherence.pct.toFixed(0)}%`}</span><span className="ml-3 text-muted">of recorded plan · 7 days</span></p><div className="grid grid-cols-7 gap-2" aria-label="Exercise minutes over the last 7 days">{days.map((day) => { const mins = sessions.filter((s) => s.date === day).reduce((n, s) => n + s.doneMin, 0); return <div key={day} className="text-center"><div className="flex h-20 items-end rounded-sm bg-surface-2"><div className="w-full bg-link" style={{ height: `${Math.min(100, mins / 120 * 100)}%` }} /></div><span className="num text-xs">{mins}</span></div> })}</div><ProvenanceBadge provenance={{ kind: 'simulated', note: 'Calculated from self-reported minutes.' }} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Mission readiness</CardTitle></CardHeader><CardContent className="space-y-3"><p className="flex items-center gap-2"><Flame aria-hidden className="size-4" /><span className="num">{streak}</span> day streak <ProvenanceBadge provenance={{ kind: 'simulated' }} /></p><ul className="space-y-2 text-sm text-muted"><li><Trophy aria-hidden className="mr-2 inline size-4" />First session {sessions.some((s) => s.doneMin > 0) ? '· achieved' : '· in progress'}</li><li><Trophy aria-hidden className="mr-2 inline size-4" />7-day streak {streak >= 7 ? '· achieved' : '· in progress'}</li><li><Trophy aria-hidden className="mr-2 inline size-4" />60 minutes in one day {sessions.some((s) => s.doneMin >= 60) ? '· achieved' : '· in progress'}</li></ul></CardContent></Card>
    </div>
  </div>
}
