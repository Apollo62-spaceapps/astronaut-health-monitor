// Card da zona (BODY-03), nesta ordem: Function · Indicator · Related hazard ·
// How to measure / Why it matters / What to do · Source. Sem protocolo com fonte → "Consult your flight surgeon."
import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { BODY_ZONES, HAZARD_LABEL, RADIATION_OVERLAY } from '@/domain/config/bodyZones'
import { ENVIRONMENTS } from '@/domain/config/environments'
import type { BodyIndicator, BodyZone, MissionMode, SourceId, VitalKind, ZoneStatus } from '@/domain/types'
import { VITAL_KINDS } from '@/domain/types'
import type { EngineOutput } from '@/domain/rules/engine'
import { accessLevel } from '@/domain/rules/privacy'
import { formatDeviation } from '@/domain/rules/vitals'
import { RATE_NOT_SOURCED, SHELTER_LABEL, SHELTER_STEPS } from '@/domain/rules/radiation'
import { StatusBadge } from '@/components/StatusBadge'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { VITAL_LABEL, VITAL_UNIT, formatVitalValue } from '@/lib/format'
import { CONSULT, ZONE_ACTIONS, ZONE_CONTENT } from '@/features/overview/zoneContent'
import type { MapTarget } from '@/features/overview/BodyMap'

const isVital = (i: BodyIndicator): i is VitalKind => (VITAL_KINDS as readonly string[]).includes(i)

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

function Sources({ ids }: { ids: SourceId[] }) {
  if (ids.length === 0) return <span className="text-muted">No source yet. {CONSULT}</span>
  return (
    <span className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <a key={id} href="#/sources" className="num text-link">
          [{id}]
        </a>
      ))}
    </span>
  )
}

function WhatToDo({ status }: { status: ZoneStatus | null }) {
  if (status === 'attention' || status === 'urgent')
    return (
      <ul className="list-inside list-disc">
        {ZONE_ACTIONS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    )
  if (status === 'restricted')
    return <p>Private medical data. Visible only with the astronaut's consent or through audited emergency access.</p>
  if (status === null) return <p>No data yet — log a measurement from the mission routine.</p>
  return <p>Keep your scheduled measurements.</p>
}

function Indicator({
  indicator,
  out,
  role,
}: {
  indicator: BodyIndicator
  out: EngineOutput
  role: EngineOutput['privacy']
}) {
  if (isVital(indicator)) {
    const ev = out.vitals.find((v) => v.kind === indicator)
    if (!ev) return <li className="text-muted">{VITAL_LABEL[indicator]}: no data</li>
    return (
      <li className="flex flex-wrap items-center gap-2">
        <span>{VITAL_LABEL[indicator]}</span>
        <span className="num font-semibold">
          {formatVitalValue(indicator, ev.latest.value)} {VITAL_UNIT[indicator]}
        </span>
        <span className="text-muted">
          vs your pre-flight baseline{' '}
          <span className="num">{formatVitalValue(indicator, ev.baseline.preflightMean)}</span>
        </span>
        <StatusBadge status={ev.level} detail={formatDeviation(ev.deviationPct)} />
        <ProvenanceBadge provenance={ev.latest.provenance} />
      </li>
    )
  }
  if (indicator === 'mood' || indicator === 'sleep') {
    const access = accessLevel('wellbeingAlert', role)
    const label = indicator === 'mood' ? 'Mood check-in' : 'Sleep check-in'
    if (access === 'denied')
      return (
        <li className="flex items-center gap-2 text-muted">
          <Lock aria-hidden className="size-4" /> {label}: Restricted — private medical data
        </li>
      )
    const level = out.indicatorLevels[indicator]
    return (
      <li className="flex flex-wrap items-center gap-2">
        <span>{label}</span>
        {level ? <StatusBadge status={level} /> : <span className="text-muted">no data</span>}
        {access === 'alertLevelOnly' && (
          <span className="text-xs text-muted">Alert level only (shared with consent)</span>
        )}
        <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Self-report, not a clinical assessment' }} />
      </li>
    )
  }
  // exerciseAdherence (Legs, P1)
  const pct = out.exercise.adherence.pct
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span>Weekly exercise adherence</span>
      <span className="num font-semibold">{pct === null ? '—' : `${Math.round(pct)}%`}</span>
      <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Self-reported sessions' }} />
    </li>
  )
}

function HazardLine({ zone, mode }: { zone: BodyZone; mode: MissionMode }) {
  if (zone.hazard === null || zone.hazardBasis === 'pending') return <p>Related hazard: under review.</p>
  const emphasized = ENVIRONMENTS[mode].emphasizedHazards.includes(zone.hazard)
  return (
    <p className="flex flex-wrap items-center gap-2">
      {HAZARD_LABEL[zone.hazard]}
      {zone.hazardBasis === 'inference' && (
        <span className="rounded bg-white/10 px-1.5 text-xs text-muted">Team inference</span>
      )}
      {emphasized && (
        <span className="rounded bg-link/15 px-1.5 text-xs text-link">Emphasized in {ENVIRONMENTS[mode].label}</span>
      )}
    </p>
  )
}

export function ZoneCard({ target, out, mode }: { target: MapTarget; out: EngineOutput; mode: MissionMode }) {
  if (target === 'radiation') {
    const d = out.radiation
    const shelter = out.alerts.find((a) => a.ruleId === 'R-RAD-03')
    return (
      <article aria-labelledby="zone-card-title" className="flex flex-col gap-4 rounded-lg border border-white/10 p-5">
        <h2 id="zone-card-title" className="text-xl">
          Radiation · whole body
        </h2>
        <Section title="Function">Overlay for the whole body: space radiation reaches every tissue.</Section>
        <Section title="Indicator">
          {d.pctOfLimit === null ? (
            <p className="text-muted">Career dose: {RATE_NOT_SOURCED}.</p>
          ) : (
            <p className="flex flex-wrap items-center gap-2">
              Career dose <span className="num font-semibold">{d.totalMSv!.toFixed(1)} mSv</span>
              <span className="num text-muted">
                = {Math.round(d.pctOfLimit)}% of {d.limitMSv} mSv
              </span>
              {d.provenance && <ProvenanceBadge provenance={d.provenance} />}
            </p>
          )}
        </Section>
        <Section title="Related hazard">
          <p>{HAZARD_LABEL[RADIATION_OVERLAY.hazard]}</p>
        </Section>
        <Section title="What to do">
          {shelter ? (
            <>
              <ol className="list-inside list-decimal">
                {SHELTER_STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-1 text-xs text-muted">{SHELTER_LABEL}</p>
            </>
          ) : (
            <p>No active solar particle event. See the Radiation screen for the dose details.</p>
          )}
        </Section>
        <Section title="Source">
          <Sources ids={[...RADIATION_OVERLAY.sourceIds, 'S09']} />
        </Section>
      </article>
    )
  }

  const zone = BODY_ZONES.find((z) => z.id === target)!
  const status = out.body[zone.id]
  const content = ZONE_CONTENT[zone.id]
  const restricted = status === 'restricted'

  return (
    <article aria-labelledby="zone-card-title" className="flex flex-col gap-4 rounded-lg border border-white/10 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="zone-card-title" className="text-xl">
          {zone.label}
        </h2>
        {status ? <StatusBadge status={status} /> : <span className="text-sm text-muted">No data</span>}
      </div>
      <Section title="Function">{zone.functionText}</Section>
      <Section title="Indicator">
        {restricted ? (
          <p className="flex items-center gap-2 text-muted">
            <Lock aria-hidden className="size-4" /> Restricted — private medical data
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {zone.indicators.map((i) => (
              <Indicator key={i} indicator={i} out={out} role={out.privacy} />
            ))}
          </ul>
        )}
      </Section>
      <Section title="Related hazard">
        <HazardLine zone={zone} mode={mode} />
      </Section>
      <Section title="How to measure">{content.howToMeasure}</Section>
      <Section title="Why it matters">{content.whyItMatters ? content.whyItMatters.text : CONSULT}</Section>
      <Section title="What to do">
        <WhatToDo status={status} />
        {status !== 'normal' && status !== null && !restricted && <p className="mt-1 text-muted">{CONSULT}</p>}
      </Section>
      <Section title="Source">
        <Sources ids={content.whyItMatters?.sourceIds ?? zone.sourceIds} />
      </Section>
      {!restricted && zone.indicators.some((i) => i !== 'exerciseAdherence') && <IllustrativeThresholds />}
    </article>
  )
}
