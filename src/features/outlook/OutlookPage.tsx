// Crew outlook (L7 §5A, R-RISK-01). Linha por tripulante: nível (cor + ícone + texto), hazard principal e os
// drivers que mais contribuem, com selo. NÃO é previsão nem diagnóstico. Privacidade (R-PRIV-01): o astronauta vê
// o próprio detalhe e só o nível dos colegas; o CMO não vê humor e sono sem break-glass.
import { useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { OUTLOOK_DISCLAIMER } from '@/ai/identity'
import { etaText, RISK_TEXT } from '@/ai/reply'
import { HAZARD_LABEL } from '@/domain/config/bodyZones'
import { relatedEvents } from '@/domain/config/riskEvents'
import type { RiskDriver, VisibleOutlook } from '@/domain/rules/risk'
import { VITAL_SAFE_ACTIONS } from '@/domain/rules/vitals'
import { Button } from '@/components/ui/button'
import { DayLabel } from '@/components/DayLabel'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { SourceRef } from '@/components/SourceRef'
import { formatUtcTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { RiskBadge } from '@/features/assistant/ReplyCard'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'

const isVisible = (d: NonNullable<VisibleOutlook['drivers']>[number]): d is RiskDriver => !('restricted' in d)

function DriverChip({ d }: { d: NonNullable<VisibleOutlook['drivers']>[number] }) {
  if (!isVisible(d))
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">
        <Lock aria-hidden className="size-3" /> {d.label} · ◼ Restricted
      </span>
    )
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-xs">
      <span>{d.label}</span>
      <span className="num text-muted">{d.valueText}</span>
      {d.adapting && <span className="text-muted">↻ Adapting</span>}
      <span
        className={cn(
          'text-[10px] font-medium tracking-wider uppercase',
          d.provenance === 'REAL' ? 'text-link' : 'text-muted',
        )}
      >
        {d.provenance}
      </span>
    </span>
  )
}

export function OutlookPage() {
  const ctx = useOrbitContext()
  const ask = useOrbitStore((s) => s.ask)
  const setPacket = useOrbitStore((s) => s.setPacket)
  const [selectedId, setSelectedId] = useState('A')
  const selected = ctx.crew.find((c) => c.id === selectedId) ?? ctx.crew[0]!
  const astronaut = ctx.role === 'ASTRONAUT'
  const label = (c: VisibleOutlook) => (c.isSelf && astronaut ? `${c.name} (you)` : c.name)
  const visibleDrivers = selected.drivers?.filter(isVisible) ?? []
  const events = selected.hazard
    ? relatedEvents(
        selected.hazard,
        visibleDrivers.filter((d) => d.score > 0).map((d) => d.id),
      )
    : []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <DayLabel />
        <h1 className="text-3xl">Crew outlook</h1>
        <p className="max-w-3xl text-lg">
          Which factors raise each crew member&apos;s exposure to a NASA HRP hazard today, before anything turns red.
        </p>
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {OUTLOOK_DISCLAIMER} <IllustrativeThresholds />
        </p>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-label="Crew" className="rounded-lg bg-surface p-2">
          <ul className="divide-y divide-border/60">
            {ctx.crew.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={c.id === selected.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'flex w-full cursor-pointer flex-col gap-2 rounded-md p-3 text-left hover:bg-surface-2',
                    c.id === selected.id && 'bg-surface-2',
                  )}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{label(c)}</span>
                    <span className="flex items-center gap-3">
                      {c.hazard && <span className="text-sm text-muted">{HAZARD_LABEL[c.hazard]}</span>}
                      <RiskBadge level={c.level} />
                    </span>
                  </span>
                  {c.drivers === null ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <Lock aria-hidden className="size-3" /> Only the level is shared with you.
                    </span>
                  ) : c.drivers.length === 0 ? (
                    <span className="text-xs text-muted">No driver is raising the outlook.</span>
                  ) : (
                    <span className="flex flex-wrap gap-1.5">
                      {c.drivers.slice(0, 3).map((d) => (
                        <DriverChip key={d.id} d={d} />
                      ))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="px-3 pt-2 pb-1 text-xs text-muted">
            Synthetic crew (SIMULATED), 4 people like a HERA analog crew <SourceRef ids={['S26']} className="text-xs" />{' '}
            · <span className="num">{formatUtcTime(ctx.simNowIso)}</span> simulated
          </p>
        </section>

        <article aria-labelledby="outlook-detail" className="space-y-4 rounded-lg bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="outlook-detail" className="text-xl">
              {label(selected)}
            </h2>
            <RiskBadge level={selected.level} />
          </div>
          {selected.drivers === null ? (
            <p className="flex items-start gap-2 text-sm text-muted">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0" /> Only the level ({RISK_TEXT[selected.level]}) is
              shared with you. Details stay with {selected.name} and the medical team.
            </p>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
                  What is raising the outlook
                </h3>
                {selected.drivers.length === 0 ? (
                  <p className="text-sm text-muted">Nothing today.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {selected.drivers.map((d) => (
                      <li key={d.id}>
                        <DriverChip d={d} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="space-y-1 text-sm">
                <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Related hazard</h3>
                {selected.hazard ? (
                  <>
                    <p>
                      {HAZARD_LABEL[selected.hazard]} <SourceRef ids={['S19']} className="text-xs" />
                    </p>
                    <p className="text-muted">
                      {events.length ? (
                        <>
                          Related HRP risk: {events.map((e) => e.label.toLowerCase()).join(', ')}{' '}
                          <SourceRef ids={['S23']} className="text-xs" />
                        </>
                      ) : (
                        'Related event: under review.'
                      )}{' '}
                      Mapping reviewed by: pending.
                    </p>
                  </>
                ) : (
                  <p className="text-muted">No hazard is raised today.</p>
                )}
              </section>
            </>
          )}
          <section className="space-y-1 text-sm">
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Safe actions</h3>
            <p>{VITAL_SAFE_ACTIONS.join(' · ')}</p>
          </section>
          <section className="space-y-1 text-sm">
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Escalation</h3>
            <p>{etaText(ctx)}</p>
          </section>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                ask(
                  {
                    text: `Why is ${selected.isSelf && astronaut ? 'my outlook' : selected.name} ${RISK_TEXT[selected.level].toLowerCase()}?`,
                    intent: 'riskOutlook',
                    crewId: selected.id,
                  },
                  { openDrawer: true },
                )
              }
            >
              <Sparkles aria-hidden /> Explain with Orbit
            </Button>
            {(selected.level === 'elevated' || selected.level === 'high') && (
              <Button variant="outline" size="sm" onClick={() => setPacket({})}>
                Notify CMO
              </Button>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
