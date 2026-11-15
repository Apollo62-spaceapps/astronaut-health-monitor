import { AlertTriangle, ExternalLink, Radiation, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { useAppStore } from '@/state/store'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { careerDose, missionDoseForEnvironment, radiationShelterAlert } from '@/domain/rules/radiation'

export function RadiationPage() {
  const environment = useAppStore((s) => s.environment)
  const radiation = useAppStore((s) => s.radiation)
  const missionDay = useAppStore((s) => s.missionDay)
  const event = useAppStore((s) => s.spaceWeatherEvent)
  const eventReplayed = useAppStore((s) => s.eventReplayed)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const replaySolarEvent = useAppStore((s) => s.replaySolarEvent)
  const endShelter = useAppStore((s) => s.endShelter)
  const env = ENVIRONMENTS[environment]
  const missionDose = missionDoseForEnvironment(missionDay, environment)
  const dose = careerDose(radiation, missionDose)
  const alert = radiationShelterAlert(event, shelterActive, simNowIso)

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-muted">Radiation · {env.label}</p><h1 className="mt-2 text-3xl">Radiation monitoring</h1><p className="mt-2 text-muted">Career exposure scenario and space weather event replay.</p></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Radiation aria-hidden className="size-5" />Career dose</CardTitle></CardHeader><CardContent className="space-y-4">
      {dose === null ? <p className="rounded-md border border-border bg-surface-2 p-4 text-muted">Rate not sourced for this environment. No new mission dose is added.</p> : <>
        <div className="flex items-baseline gap-2"><span className="num text-4xl">{dose.totalMSv.toFixed(1)}</span><span>of {radiation.careerLimitMSv} mSv</span><span className="num ml-auto text-2xl">{dose.percent.toFixed(0)}%</span></div>
        <div role="progressbar" aria-label={`Career dose ${dose.percent.toFixed(0)} percent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, dose.percent)} className="h-3 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-link" style={{ width: `${Math.min(100, dose.percent)}%` }} /></div>
        <p className="text-sm text-muted">Prior dose {radiation.careerPriorMSv.toFixed(1)} mSv + mission dose {missionDose!.toFixed(1)} mSv</p>
        <p className="text-xs text-muted">Simulated using MSL/RAD cruise average (galactic cosmic rays).</p>
      </>}
      <div className="flex gap-2"><ProvenanceBadge provenance={{ kind: 'simulated', basis: 'S09' }} /><ProvenanceBadge provenance={{ kind: 'real', sourceId: 'S03' }} /></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle aria-hidden className="size-5" />Space weather event</CardTitle></CardHeader><CardContent className="space-y-4">
      {event && <><p className="font-semibold">Solar energetic particle event · GOES-P SEISS</p><p className="num">{event.eventTime}</p><ProvenanceBadge provenance={event.provenance} /><p className="text-sm text-muted">Real event observed near Earth (NASA DONKI), replayed in this scenario.</p><a href={event.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">Open event in NASA DONKI <ExternalLink aria-hidden className="size-4" /></a>
        {eventReplayed ? <p className="text-muted">Event replayed in demo.</p> : <Button onClick={replaySolarEvent}>Replay event</Button>}</>}
    </CardContent></Card>
    {alert && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-urgent"><Shield aria-hidden className="size-5" />{alert.level === 'urgent' ? '● Urgent · ' : ''}{alert.title}</CardTitle></CardHeader><CardContent className="space-y-4"><ol className="list-decimal space-y-2 pl-5">{alert.safeActions.map((step) => <li key={step}>{step}</li>)}</ol><p className="text-sm text-muted">Adapted from NASA Orion radiation shelter procedure.</p><ProvenanceBadge provenance={{ kind: 'real', sourceId: 'S05' }} /><p className="text-xs text-muted">Consult your flight surgeon.</p><Button variant="outline" onClick={endShelter}>End shelter demo</Button></CardContent></Card>}
    {shelterActive && <Card><CardHeader><CardTitle>Exercise schedule</CardTitle></CardHeader><CardContent><p className="flex items-center gap-2 text-muted"><Shield aria-hidden className="size-4" />Today's sessions postponed — shelter active · SIMULATED</p></CardContent></Card>}
  </div>
}
