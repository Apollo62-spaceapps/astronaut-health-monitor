// Vitais (L4 #55): um card + um gráfico por indicador — CORE-02, CORE-03, CORE-04, CORE-05, CORE-08, NFR-03.
// Status, desvio e baselines vêm do motor de regras (useEngine); a tela não decide nada.
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from 'lucide-react'
import type { VitalKind } from '@/domain/types'
import { VITAL_KINDS } from '@/domain/types'
import { BODY_ZONES } from '@/domain/config/bodyZones'
import { formatDeviation, trendPct } from '@/domain/rules/vitals'
import { MISSION_START_ISO, useAppStore } from '@/state/store'
import { useEngine } from '@/state/useEngine'
import { MetricCard } from '@/components/MetricCard'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VITAL_LABEL, VITAL_UNIT, formatVitalValue } from '@/lib/format'
import { CONSULT, ZONE_CONTENT } from '@/features/overview/zoneContent'
import { VitalChart, chartPoints } from '@/features/vitals/VitalChart'

/** "Why this matters" (CORE-08): o texto com fonte da zona do corpo a que o vital pertence. */
function whyItMatters(kind: VitalKind) {
  const zone = BODY_ZONES.find((z) => (z.indicators as string[]).includes(kind))
  return zone ? ZONE_CONTENT[zone.id].whyItMatters : null
}

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted">Trend: not enough data</span>
  const Icon = pct > 0.5 ? ArrowUpRight : pct < -0.5 ? ArrowDownRight : ArrowRight
  return (
    <span className="inline-flex items-center gap-1 text-muted">
      <Icon aria-hidden className="size-4" />
      Trend <span className="num">{formatDeviation(pct)}</span> vs previous 7 days
    </span>
  )
}

export function VitalsPage() {
  const out = useEngine()
  const vitals = useAppStore((s) => s.vitals)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const missionDay = useAppStore((s) => s.missionDay)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Mission day <span className="num">{missionDay}</span> · Simulated
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Vitals</h1>
          <p className="mt-2 text-muted">Today's value against your own normal range, set from your pre-flight exam.</p>
        </div>
        <IllustrativeThresholds />
      </header>

      <ul className="flex flex-col gap-4">
        {VITAL_KINDS.map((kind) => {
          const ev = out.vitals.find((v) => v.kind === kind)
          const why = whyItMatters(kind)
          return (
            <li key={kind} className="grid gap-6 rounded-lg bg-surface p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              {ev ? (
                <MetricCard
                  label={VITAL_LABEL[kind]}
                  value={formatVitalValue(kind, ev.latest.value)}
                  unit={VITAL_UNIT[kind]}
                  status={ev.level}
                  statusDetail={`${formatDeviation(ev.deviationPct)} vs pre-flight`}
                  provenance={ev.latest.provenance}
                  className="bg-transparent p-0"
                  caption={
                    <span className="flex flex-col gap-1">
                      <span>
                        Pre-flight <span className="num">{formatVitalValue(kind, ev.baseline.preflightMean)}</span> ·
                        In-flight <span className="num">{formatVitalValue(kind, ev.baseline.inflightMean)}</span>{' '}
                        {VITAL_UNIT[kind]}
                      </span>
                      <Trend pct={trendPct(kind, vitals, simNowIso)} />
                    </span>
                  }
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center gap-1 self-start text-sm text-link">
                        <Info aria-hidden className="size-4" /> Why this matters
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {why ? (
                        <>
                          {why.text} <span className="num">[{why.sourceIds.join(', ')}]</span>
                        </>
                      ) : (
                        CONSULT
                      )}
                    </TooltipContent>
                  </Tooltip>
                </MetricCard>
              ) : (
                <MetricCard
                  label={VITAL_LABEL[kind]}
                  value="—"
                  caption="No data"
                  provenance={{ kind: 'simulated' }}
                  className="bg-transparent p-0"
                />
              )}
              {ev ? (
                <VitalChart
                  kind={kind}
                  baseline={ev.baseline}
                  status={ev.level}
                  xDomain={[Math.max(0, missionDay - 120), missionDay]}
                  points={chartPoints(
                    vitals.filter((r) => r.kind === kind),
                    MISSION_START_ISO,
                    simNowIso,
                  )}
                />
              ) : (
                <p className="self-center text-muted">No readings to chart.</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
