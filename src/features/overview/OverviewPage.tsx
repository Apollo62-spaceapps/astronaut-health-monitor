// Overview (L3 #54): "Your body, day N." — CORE-01, CORE-08, CORE-09, BODY-01..04, BODY-06, BODY-07.
// Tudo vem do motor de regras (useEngine); a tela não decide status nenhum.
import { useState } from 'react'
import { BODY_ZONES } from '@/domain/config/bodyZones'
import { ENVIRONMENTS } from '@/domain/config/environments'
import type { BodyZoneId, VitalKind, ZoneStatus } from '@/domain/types'
import { visibleAlerts, type EngineOutput } from '@/domain/rules/engine'
import { formatDeviation, type VitalEvaluation } from '@/domain/rules/vitals'
import { RATE_NOT_SOURCED } from '@/domain/rules/radiation'
import { worstLevel } from '@/domain/rules/body'
import { useAppStore } from '@/state/store'
import { useEngine } from '@/state/useEngine'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/MetricCard'
import { StatusBadge } from '@/components/StatusBadge'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { MeasurementDialog } from '@/features/routine/MeasurementDialog'
import { BodyMap, type MapTarget } from '@/features/overview/BodyMap'
import { ZoneCard } from '@/features/overview/ZoneCard'
import { VITAL_LABEL, formatDuration, formatVitalValue } from '@/lib/format'

const ZONE_LABELS = Object.fromEntries(BODY_ZONES.map((z) => [z.id, z.id === 'skin' ? 'Skin' : z.label])) as Record<
  BodyZoneId,
  string
>

/** Desvio em palavras para o aria-label (BODY-04): "resting heart rate +18% vs baseline". */
const devText = (ev: VitalEvaluation) =>
  `${VITAL_LABEL[ev.kind].toLowerCase()} ${formatDeviation(ev.deviationPct)} vs baseline`

function zoneDetail(id: BodyZoneId, out: EngineOutput): string | undefined {
  const zone = BODY_ZONES.find((z) => z.id === id)!
  if (out.body[id] === 'restricted') return 'private medical data'
  const evs = out.vitals.filter((v) => (zone.indicators as string[]).includes(v.kind))
  if (evs.length === 0) return undefined
  // O indicador mais distante do baseline explica a cor da zona.
  const top = [...evs].sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))[0]!
  return devText(top)
}

/** Frase do topo, montada a partir do alerta mais grave visível (determinística, sem IA). */
function headline(out: EngineOutput, groundSec: number, isEarth: boolean): string {
  const reply = isEarth
    ? 'The flight surgeon is available now.'
    : `Ground reply would take ${formatDuration(groundSec)}.`
  const alerts = visibleAlerts(out.alerts, out.privacy)
  const top = alerts[0]
  if (!top) return `All indicators are Normal against your own baseline today. ${reply}`
  if (top.ruleId === 'R-RAD-03') return `Solar particle event: follow the shelter procedure now. ${reply}`
  const ev = out.vitals.find((v) => top.id.startsWith(`R-VIT-02:${v.kind}`))
  if (ev) {
    const pct = Math.round(Math.abs(ev.deviationPct))
    return `${VITAL_LABEL[ev.kind]} is ${pct}% ${ev.deviationPct >= 0 ? 'above' : 'below'} your own baseline. Re-measure, then notify the CMO. ${reply}`
  }
  return `${top.title}. ${reply}`
}

function vitalCardProps(out: EngineOutput, kind: VitalKind) {
  const ev = out.vitals.find((v) => v.kind === kind)
  return ev
    ? {
        value: formatVitalValue(kind, ev.latest.value),
        status: ev.level as ZoneStatus,
        statusDetail: formatDeviation(ev.deviationPct),
        provenance: ev.latest.provenance,
      }
    : null
}

export function OverviewPage() {
  const out = useEngine()
  const environment = useAppStore((s) => s.environment)
  const missionDay = useAppStore((s) => s.missionDay)
  const routine = useAppStore((s) => s.routine)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const addReading = useAppStore((s) => s.addReading)
  const advanceDay = useAppStore((s) => s.advanceDay)
  const setRoutineStatus = useAppStore((s) => s.setRoutineStatus)
  const [selected, setSelected] = useState<MapTarget>('heart')
  const [logOpen, setLogOpen] = useState(false)

  const env = ENVIRONMENTS[environment]
  const groundSec = 2 * env.oneWayDelaySec
  const measures = routine.filter((r) => r.kind === 'measure' && r.environments.includes(environment))
  const pending = measures.find((r) => r.status === 'due' || r.status === 'overdue')
  const logItem = pending ?? measures.find((r) => r.vital === 'heartRate') ?? null
  // Só um botão vermelho por tela (DESIGN-SYSTEM §6): se a faixa da missão já mostra o lembrete, este fica secundário.
  const bannerHasPrimary = !!pending && !shelterActive

  const hr = vitalCardProps(out, 'heartRate')
  const sys = out.vitals.find((v) => v.kind === 'systolicBP')
  const dia = out.vitals.find((v) => v.kind === 'diastolicBP')
  const bpWorst = sys && dia ? worstLevel([sys.level, dia.level]) : null
  const bpTop = sys && dia ? (Math.abs(sys.deviationPct) >= Math.abs(dia.deviationPct) ? sys : dia) : null
  const dose = out.radiation
  const adh = out.exercise.adherence
  const shelterAlertActive = out.alerts.some((a) => a.ruleId === 'R-RAD-03')
  const alerts = visibleAlerts(out.alerts, out.privacy)

  const detail: Partial<Record<MapTarget, string>> = {
    radiation:
      dose.pctOfLimit === null
        ? RATE_NOT_SOURCED
        : `career dose ${Math.round(dose.pctOfLimit)}% of ${dose.limitMSv} mSv`,
  }
  for (const z of BODY_ZONES) detail[z.id] = zoneDetail(z.id, out)

  return (
    <div className="space-y-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <section aria-labelledby="overview-title" className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Mission day <span className="num">{missionDay}</span> · Simulated · {env.label}
          </p>
          <h1 id="overview-title" className="text-5xl leading-tight font-extrabold tracking-tight">
            Your body, day <span className="num">{missionDay}</span>.
          </h1>
          <p className="text-lg">{headline(out, groundSec, environment === 'EARTH')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={bannerHasPrimary ? 'outline' : 'default'}
              onClick={() => setLogOpen(true)}
              disabled={!logItem}
            >
              Log measurement
            </Button>
            <Button
              variant="outline"
              onClick={() => advanceDay(1)}
              title="Demo control: moves the simulated mission clock forward one day (BODY-08)"
            >
              Advance day{' '}
              <span className="ml-1 rounded border border-white/30 px-1 text-[11px] uppercase tracking-wider">
                Demo
              </span>
            </Button>
            <IllustrativeThresholds />
          </div>

          <section aria-labelledby="alerts-title" className="mt-2 flex flex-col gap-3">
            <h2 id="alerts-title" className="text-lg">
              Active alerts
            </h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted">No active alerts.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-md bg-surface p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.level} />
                      <span className="font-semibold">{a.title}</span>
                    </div>
                    <p className="mt-1 text-muted">
                      {a.escalateTo.length
                        ? `Escalation: ${a.escalateTo.map((r) => (r === 'FLIGHT_SURGEON' ? 'flight surgeon' : r)).join(', ')} · ${out.escalation.replyText}`
                        : 'No escalation.'}{' '}
                      <span className="num text-xs">[{a.ruleId}]</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>

        <section
          aria-label="Body status map"
          className="grid gap-4 rounded-lg bg-surface p-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        >
          <div className="flex flex-col items-center gap-2">
            <BodyMap
              status={out.body}
              labels={ZONE_LABELS}
              detail={detail}
              radiation={{
                status: shelterAlertActive ? 'urgent' : null,
                label:
                  dose.pctOfLimit === null
                    ? 'Radiation · rate not sourced'
                    : `Radiation · ${Math.round(dose.pctOfLimit)}% of career limit`,
              }}
              selected={selected}
              onSelect={setSelected}
              showLegs
              pulse
            />
            <p className="text-center text-xs text-muted">
              Select a zone (click, Enter or Space) to see its card. Some data simulated.
            </p>
          </div>
          <ZoneCard target={selected} out={out} mode={environment} />
        </section>
      </div>

      <section aria-label="Key indicators" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hr ? (
          <MetricCard label="Heart rate · rest" unit="bpm" {...hr} />
        ) : (
          <MetricCard label="Heart rate · rest" value="—" caption="No data" provenance={{ kind: 'simulated' }} />
        )}
        {sys && dia && bpWorst && bpTop ? (
          <MetricCard
            label="Blood pressure"
            value={`${formatVitalValue('systolicBP', sys.latest.value)}/${formatVitalValue('diastolicBP', dia.latest.value)}`}
            unit="mmHg"
            status={bpWorst}
            statusDetail={formatDeviation(bpTop.deviationPct)}
            provenance={sys.latest.provenance}
          />
        ) : (
          <MetricCard label="Blood pressure" value="—" caption="No data" provenance={{ kind: 'simulated' }} />
        )}
        {dose.pctOfLimit === null ? (
          <MetricCard
            label="Career dose"
            value="—"
            caption={`Mission dose: ${RATE_NOT_SOURCED}.`}
            provenance={{ kind: 'simulated' }}
          />
        ) : (
          <MetricCard
            label="Career dose"
            value={`${Math.round(dose.pctOfLimit)}%`}
            caption={
              <>
                of <span className="num">{dose.limitMSv}</span> mSv ·{' '}
                <span className="num">{dose.totalMSv!.toFixed(1)}</span> mSv
              </>
            }
            provenance={dose.provenance ?? { kind: 'simulated' }}
          >
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="presentation">
              <div className="h-full bg-link" style={{ width: `${Math.min(100, dose.pctOfLimit)}%` }} />
            </div>
          </MetricCard>
        )}
        <MetricCard
          label="Exercise adherence"
          value={adh.pct === null ? '—' : `${Math.round(adh.pct)}%`}
          caption={
            <>
              <span className="num">{out.exercise.streakDays}</span>-day streak · last{' '}
              <span className="num">{adh.days}</span> days
            </>
          }
          provenance={{ kind: 'simulated', note: 'Self-reported sessions' }}
        />
      </section>

      <MeasurementDialog
        item={logItem}
        open={logOpen}
        onOpenChange={setLogOpen}
        nowIso={simNowIso}
        onSave={(item, reading) => {
          addReading(reading)
          setRoutineStatus(item.id, 'done')
        }}
      />
    </div>
  )
}
