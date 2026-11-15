// Radiação (F2 #45) — RAD-01..05, RAD-07. Diz o que é REAL (limite [S03], evento [S07]) e o que é
// SIMULATED (doses, calculadas a partir da taxa do MSL/RAD [S08, S09]).
import { AlertTriangle, ExternalLink, Radiation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { SourceRef } from '@/components/SourceRef'
import { DayLabel } from '@/components/DayLabel'
import { useAppStore } from '@/state/store'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { careerDose, SHELTER_LABEL, shelterAlert } from '@/domain/rules/radiation'
import { projectDose } from '@/domain/rules/projection'
import { formatMSv, formatUtc } from '@/lib/format'

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
  // R-RAD-01/02 e R-RAD-03 (regras do Lucas, L2).
  const dose = careerDose(radiation, missionDay, environment)
  const alert = shelterAlert(event, shelterActive, simNowIso)
  const sourced = dose.totalMSv !== null && dose.pctOfLimit !== null && dose.missionMSv !== null
  const projection = projectDose(dose)

  return (
    <div className="space-y-6">
      <header>
        <DayLabel />
        <h1 className="mt-2 text-3xl">Radiation monitoring</h1>
        <p className="mt-2 text-muted">Career exposure scenario and space weather event replay.</p>
      </header>
      {alert && (
        <Card className="border-2 border-urgent">
          <div aria-hidden className="hatch h-2 rounded-t-lg text-urgent" />
          <CardHeader className="max-md:px-4">
            <CardTitle className="text-urgent">
              <span aria-hidden>●</span> Urgent · {alert.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-md:px-4">
            <ol className="list-decimal space-y-2 pl-5">
              {alert.safeActions.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {SHELTER_LABEL} <SourceRef ids={['S05']} />
            </p>
            <p className="text-xs text-muted">Consult your flight surgeon.</p>
            <Button variant="outline" onClick={endShelter} className="max-md:h-11 max-md:w-full">
              End shelter · demo
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="max-md:px-4">
            <CardTitle className="flex items-center gap-2">
              <Radiation aria-hidden className="size-5" />
              Career dose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-md:px-4">
            {sourced ? (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="num text-4xl">{formatMSv(dose.totalMSv!)}</span>
                  <span className="text-muted">mSv</span>
                  <span className="ml-auto text-lg">
                    <span className="num">{dose.pctOfLimit!.toFixed(0)}%</span>{' '}
                    <span className="text-muted">of your limit</span>
                  </span>
                </div>
                {/* Régua 0–600 mSv (DESIGN-SYSTEM v2 §6): preenchimento branco, limite marcado em cinza. */}
                <div className="space-y-1">
                  <div
                    role="progressbar"
                    aria-label={`Career dose ${dose.pctOfLimit!.toFixed(0)} percent of limit`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, dose.pctOfLimit!)}
                    className="relative h-3 rounded-sm bg-surface-2"
                  >
                    <div
                      className="h-full rounded-sm bg-foreground"
                      style={{ width: `${Math.min(100, dose.pctOfLimit!)}%` }}
                    />
                    {/* Marcador neutro: cor de status só com regra de nível para a dose (R-RAD-04, P1). */}
                    <div aria-hidden className="absolute -top-1 right-0 h-5 w-0.5 bg-muted" />
                  </div>
                  <div className="num flex justify-between text-xs text-muted">
                    <span>0</span>
                    <span>{dose.limitMSv / 2}</span>
                    <span>{dose.limitMSv}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2 rounded-md bg-surface-2 p-4">
                <p>
                  <span className="num text-2xl">{formatMSv(dose.priorMSv)}</span> mSv accumulated before this mission,
                  of <span className="num">{dose.limitMSv}</span> mSv.
                </p>
                <p className="text-sm text-muted">
                  {environment === 'EARTH'
                    ? 'No new mission dose is added on Earth.'
                    : `No new mission dose is added: the daily rate for ${env.label} has no published source yet.`}
                </p>
              </div>
            )}
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 text-sm">
              <div className="contents">
                <dt className="text-muted">Career limit</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span className="num">{dose.limitMSv} mSv</span>
                  <ProvenanceBadge provenance={{ kind: 'real', sourceId: 'S03' }} />
                  <SourceRef ids={['S03']} />
                </dd>
              </div>
              <div className="contents">
                <dt className="text-muted">Prior dose</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span className="num">{formatMSv(dose.priorMSv)} mSv</span>
                  <span className="text-muted">(simulated)</span>
                </dd>
              </div>
              {sourced && (
                <div className="contents">
                  <dt className="text-muted">Mission dose</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span className="num">{formatMSv(dose.missionMSv!)} mSv</span>
                    <span className="text-muted">
                      = day <span className="num">{missionDay}</span> ×{' '}
                      <span className="num">{dose.rateMSvPerDay}</span> mSv/day, MSL/RAD cruise average (galactic cosmic
                      rays)
                    </span>
                    <ProvenanceBadge provenance={{ kind: 'simulated', basis: 'S09' }} />
                    <SourceRef ids={['S08', 'S09']} />
                  </dd>
                </div>
              )}
              {/* R-PROJ-02: mesma taxa com fonte, estendida para frente. Só onde a taxa tem fonte (ENV-04). */}
              {projection && (
                <div className="contents">
                  <dt className="text-muted">Projection</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span>
                      At this rate: <span className="num">{projection.pctIn30Days.toFixed(0)}%</span> of the limit in{' '}
                      <span className="num">30</span> days
                      {projection.daysToAttention !== null && (
                        <>
                          {' '}
                          · <span className="num">{projection.attentionPct}%</span> in ~
                          <span className="num">{projection.daysToAttention}</span> days
                        </>
                      )}
                      {projection.daysToLimit !== null && (
                        <>
                          {' '}
                          · limit in ~<span className="num">{projection.daysToLimit}</span> days
                        </>
                      )}
                    </span>
                    <span className="text-muted">(cruise rate only; a solar event adds more)</span>
                    <ProvenanceBadge provenance={{ kind: 'simulated', basis: 'S09' }} />
                    <SourceRef ids={['S08', 'S09']} />
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="max-md:px-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-5" />
              Space weather event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-md:px-4">
            {event && (
              <>
                <p className="font-semibold">Solar energetic particle event · GOES-P SEISS</p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="num">{formatUtc(event.eventTime)}</span>
                  <ProvenanceBadge provenance={event.provenance} />
                  <SourceRef ids={['S07']} />
                </p>
                <p className="text-sm text-muted">
                  Real event observed near Earth (NASA DONKI), replayed in this scenario. Data used under the CCMC terms{' '}
                  <SourceRef ids={['S06']} />.
                </p>
                <div className="flex flex-wrap items-center gap-4 max-md:flex-col max-md:items-stretch max-md:gap-2">
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 max-md:min-h-10"
                  >
                    Open event in NASA DONKI <ExternalLink aria-hidden className="size-4" />
                  </a>
                  {!eventReplayed && (
                    <Button variant="outline" onClick={replaySolarEvent} className="max-md:h-11 max-md:w-full">
                      Replay event · demo
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {shelterActive && (
        <Card>
          <CardHeader className="max-md:px-4">
            <CardTitle>Exercise schedule</CardTitle>
          </CardHeader>
          <CardContent className="max-md:px-4">
            <p className="text-muted">Today&apos;s sessions are postponed while the shelter is active.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
