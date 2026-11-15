// Baseline (L7 §5B): exame pré-voo, referência por ambiente (Reference explorer) e drift (R-TREND-01).
// Referência pessoal — não é julgamento de saúde. O nível de cada indicador continua sendo da R-VIT-02.
import { Sparkles } from 'lucide-react'
import { REFERENCE_DISCLAIMER } from '@/ai/identity'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { NO_SOURCED_SHIFT } from '@/domain/config/referenceShifts'
import { RETURN_MILESTONES, SSM_SCHEDULE, SSM_SCHEDULE_NOTE } from '@/domain/config/ssmSchedule'
import { ABSOLUTE_LIMITS_TEXT, type ReferenceOrigin } from '@/domain/rules/reference'
import { formatDeviation } from '@/domain/rules/vitals'
import { MISSION_MODES, VITAL_KINDS } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { DayLabel } from '@/components/DayLabel'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { SourceRef } from '@/components/SourceRef'
import { StatusBadge } from '@/components/StatusBadge'
import { VITAL_LABEL, VITAL_UNIT, formatVitalValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import { shownLevel } from '@/features/overview/phaseDisplay'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'

const ORIGIN: Record<ReferenceOrigin, string> = { 'pre-flight': 'pre-flight', adapting: 'adapting', adapted: 'adapted' }
const SIM = { kind: 'simulated' as const, note: 'Pre-flight exam (fictional)' }

export function ReferencePage() {
  const ctx = useOrbitContext()
  const ask = useOrbitStore((s) => s.ask)
  const astronaut = ctx.role === 'ASTRONAUT'
  const askOrbit = (text: string, intent: 'reference' | 'drift') => ask({ text, intent }, { openDrawer: true })

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <DayLabel />
        <h1 className="text-3xl">{astronaut ? 'Your baseline' : "Crew member's baseline"}</h1>
        <p className="max-w-3xl text-lg">
          The Earth exam sets the personal reference; each environment rebuilds it in a controlled way, and the app
          watches when readings move away from it.
        </p>
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {REFERENCE_DISCLAIMER} <IllustrativeThresholds />
        </p>
      </header>

      <section aria-labelledby="preflight-title" className="space-y-4 rounded-lg bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="preflight-title" className="text-xl">
            Pre-flight baseline
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => askOrbit('Where did my reference come from?', 'reference')}
          >
            <Sparkles aria-hidden /> Ask Orbit
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wider text-muted uppercase">
                <th className="p-2">Indicator</th>
                <th className="p-2">Reference</th>
                <th className="p-2">Readings</th>
                <th className="p-2">Spread (SD)</th>
                <th className="p-2">Dates</th>
                <th className="p-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {VITAL_KINDS.map((k) => {
                const q = ctx.quality[k]
                if (!q) return null
                return (
                  <tr key={k} className="border-b border-border/60 last:border-0">
                    <td className="p-2">{VITAL_LABEL[k]}</td>
                    <td className="p-2">
                      <span className="num font-semibold">{formatVitalValue(k, q.mean)}</span>{' '}
                      <span className="num text-xs text-muted">{VITAL_UNIT[k]}</span>
                    </td>
                    <td className="num p-2">
                      {q.n}
                      {q.lowConfidence && <span className="ml-2 text-xs text-muted">Low-confidence baseline</span>}
                    </td>
                    <td className="num p-2">± {q.sd.toFixed(k === 'bodyTemp' ? 2 : 1)}</td>
                    <td className="num p-2 text-muted">
                      {q.fromIso.slice(0, 10)} → {q.toIso.slice(0, 10)}
                    </td>
                    <td className="p-2">
                      <ProvenanceBadge provenance={SIM} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1 text-sm">
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">How your reference is built</h3>
            <ol className="list-inside list-decimal space-y-0.5">
              <li>An exam on Earth before flight sets the anchor (mean and spread of each indicator).</li>
              <li>After a gravity change, an adaptation window starts; urgent is never masked.</li>
              <li>After the window, the reference is rebuilt from readings in that environment.</li>
            </ol>
            <p className="text-xs text-muted">{ABSOLUTE_LIMITS_TEXT}</p>
          </div>
          <div className="space-y-1 text-sm">
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Baseline sessions</h3>
            <p>
              This scenario: one pre-flight exam, 14 daily readings (L-14 to L-1, simulated). NASA Standard Measures use
              dated sessions such as L-180 and L-90 <SourceRef ids={['S23', 'S24']} className="text-xs" />.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="explorer-title" className="space-y-3 rounded-lg bg-surface p-5">
        <h2 id="explorer-title" className="text-xl">
          Reference explorer
        </h2>
        <p className="text-sm text-muted">
          Current reference and where it comes from, by environment. {NO_SOURCED_SHIFT}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wider text-muted uppercase">
                <th className="p-2">Indicator</th>
                {MISSION_MODES.map((m) => (
                  <th
                    key={m}
                    className={cn('p-2', m === ctx.environment && 'bg-surface-2 text-foreground')}
                    aria-current={m === ctx.environment ? 'true' : undefined}
                  >
                    {ENVIRONMENTS[m].label}
                    {m === ctx.environment && ' · now'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VITAL_KINDS.map((k) => {
                const ref = ctx.references[k]
                const ev = ctx.vitals.find((v) => v.kind === k)
                if (!ref) return null
                return (
                  <tr key={k} className="border-b border-border/60 align-top last:border-0">
                    <td className="p-2">{VITAL_LABEL[k]}</td>
                    {MISSION_MODES.map((m) => {
                      const now = m === ctx.environment
                      return (
                        <td key={m} className={cn('p-2', now && 'bg-surface-2')}>
                          {now ? (
                            <div className="space-y-0.5">
                              <p>
                                <span className="num font-semibold">{formatVitalValue(k, ref.referenceValue)}</span>{' '}
                                <span className="num text-xs text-muted">{VITAL_UNIT[k]}</span>
                              </p>
                              <p className="text-xs text-muted">{ORIGIN[ref.origin]}</p>
                              {ev && (
                                <StatusBadge
                                  status={shownLevel(k, ev.level, ctx.body)}
                                  detail={`${formatDeviation(ev.deviationPct)} vs pre-flight`}
                                />
                              )}
                              {ref.origin === 'adapted' && ref.vsReferencePct !== null && (
                                <p className="num text-xs text-muted">
                                  {formatDeviation(ref.vsReferencePct)} vs adapted
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted">
                              {m === 'EARTH' ? 'pre-flight' : 'adapting on arrival, then rebuilt · no sourced shift'}
                            </p>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {ctx.environment === 'EARTH' && (
          <p className="text-sm text-muted">
            Back on Earth, readings are compared with the pre-flight exam. NASA Standard Measures follow up at{' '}
            {RETURN_MILESTONES.join(', ')} <SourceRef ids={['S23']} className="text-xs" /> — follow-up marks only, not a
            recovery time.
          </p>
        )}
      </section>

      <section aria-labelledby="drift-title" className="space-y-3 rounded-lg bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="drift-title" className="text-xl">
            Drift from your reference
          </h2>
          <Button variant="outline" size="sm" onClick={() => askOrbit('Am I drifting from my baseline?', 'drift')}>
            <Sparkles aria-hidden /> Ask Orbit
          </Button>
        </div>
        {ctx.trends.length === 0 ? (
          <p className="text-sm text-muted">No steady drift in the last 14 days.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {ctx.trends.map((t) => (
              <li key={t.kind} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-attention">▲ Trend</span>
                <span>{VITAL_LABEL[t.kind]}</span>
                <span className="num text-muted">
                  {t.direction} {Math.abs(Math.round(t.slopePerDay * 10) / 10)} {VITAL_UNIT[t.kind]}/day for {t.days}{' '}
                  days · {formatDeviation(t.latestDevPct)} vs {t.comparedTo === 'adapted' ? 'adapted' : 'pre-flight'}
                </span>
                <ProvenanceBadge provenance={{ kind: 'simulated' }} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          Trend (R-TREND-01): preventive notice, never urgent; it does not name a cause.
        </p>
      </section>

      <section aria-labelledby="ssm-title" className="space-y-3 rounded-lg bg-surface p-5">
        <h2 id="ssm-title" className="text-xl">
          NASA Standard Measures · example schedule
        </h2>
        <p className="text-sm text-muted">
          {SSM_SCHEDULE_NOTE} <SourceRef ids={['S23', 'S24']} className="text-xs" />
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wider text-muted uppercase">
                <th className="p-2">Domain</th>
                <th className="p-2">Pre-flight</th>
                <th className="p-2">In flight</th>
                <th className="p-2">Post-flight</th>
              </tr>
            </thead>
            <tbody>
              {SSM_SCHEDULE.map((r) => (
                <tr key={r.domain} className="border-b border-border/60 last:border-0">
                  <td className="p-2">{r.domain}</td>
                  <td className="num p-2 text-muted">{r.preflight}</td>
                  <td className="num p-2 text-muted">{r.inflight}</td>
                  <td className="num p-2 text-muted">{r.postflight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
