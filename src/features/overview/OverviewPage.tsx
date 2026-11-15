// Overview (L3 #54): "Your body, day N." — CORE-01, CORE-08, CORE-09, BODY-01..04, BODY-06, BODY-07.
// Tudo vem do motor de regras (useEngine); a tela não decide status nenhum.
// Perfis: o astronauta lê "Your body"; CMO e Flight Surgeon leem "Crew member" em terceira pessoa,
// sem a ação de registrar medida (que é do astronauta).
import { useState } from 'react'
import { BODY_ZONES } from '@/domain/config/bodyZones'
import { ENVIRONMENTS } from '@/domain/config/environments'
import type { BodyZoneId, MissionMode, VitalKind } from '@/domain/types'
import { visibleAlerts, type EngineOutput } from '@/domain/rules/engine'
import { formatDeviation, type VitalEvaluation } from '@/domain/rules/vitals'
import { worstLevel } from '@/domain/rules/body'
import { inAdaptation } from '@/domain/rules/phase'
import { useAppStore } from '@/state/store'
import { usePhaseStore } from '@/state/phase'
import { useEngine } from '@/state/useEngine'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/MetricCard'
import { StatusBadge } from '@/components/StatusBadge'
import { DayLabel } from '@/components/DayLabel'
import { SourceRef } from '@/components/SourceRef'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { MeasurementDialog } from '@/features/routine/MeasurementDialog'
import { BodyMap, type MapTarget } from '@/features/overview/BodyMap'
import { ZoneCard } from '@/features/overview/ZoneCard'
import { shownLevel } from '@/features/overview/phaseDisplay'
import { VITAL_LABEL, formatDuration, formatMSv, formatVitalValue } from '@/lib/format'

const ZONE_LABELS = Object.fromEntries(BODY_ZONES.map((z) => [z.id, z.id === 'skin' ? 'Skin' : z.label])) as Record<
  BodyZoneId,
  string
>

/** "on the Moon", "on the Space Station"… (texto natural em inglês). */
const ENV_PLACE: Record<MissionMode, string> = {
  EARTH: 'on Earth',
  ISS: 'on the Space Station',
  LUNAR: 'on the Moon',
  SPACECRAFT: 'on the Spacecraft',
}

const ROLE_TEXT: Record<string, string> = { CMO: 'CMO', FLIGHT_SURGEON: 'flight surgeon', ASTRONAUT: 'astronaut' }

/** Desvio em palavras para o aria-label (BODY-04): "resting heart rate +18% vs baseline". */
const devText = (ev: VitalEvaluation) =>
  `${VITAL_LABEL[ev.kind].toLowerCase()} ${formatDeviation(ev.deviationPct)} vs baseline`

/** O indicador mais distante do baseline explica a cor da zona. */
function topVital(id: BodyZoneId, out: EngineOutput): VitalEvaluation | undefined {
  const zone = BODY_ZONES.find((z) => z.id === id)!
  const evs = out.vitals.filter((v) => (zone.indicators as string[]).includes(v.kind))
  return [...evs].sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct))[0]
}

function zoneDetail(id: BodyZoneId, out: EngineOutput): string | undefined {
  if (out.body[id] === 'restricted') return 'private medical data'
  const top = topVital(id, out)
  return top ? devText(top) : undefined
}

/** Sublinha curta no mapa: só para zonas fora do Normal ("+18% vs baseline"). */
function zoneSub(id: BodyZoneId, out: EngineOutput): string | undefined {
  const st = out.body[id]
  if (!st || st === 'normal' || st === 'restricted') return undefined
  const top = topVital(id, out)
  return top ? `${formatDeviation(top.deviationPct)} vs baseline` : undefined
}

/** Frase do topo, montada a partir do alerta mais grave visível (determinística, sem IA). */
function headline(out: EngineOutput, groundSec: number, isEarth: boolean, astronaut: boolean): string {
  const reply = isEarth
    ? 'The flight surgeon is available now.'
    : `Ground reply would take ${formatDuration(groundSec)}.`
  const whose = astronaut ? 'your own' : "the crew member's"
  const alerts = visibleAlerts(out.alerts, out.privacy)
  const top = alerts[0]
  if (!top) return `All indicators are Normal against ${whose} baseline today. ${reply}`
  if (top.ruleId === 'R-RAD-03')
    return `Solar particle event: ${astronaut ? 'follow' : 'the crew follows'} the shelter procedure now. ${reply}`
  const ev = out.vitals.find((v) => top.id.startsWith(`R-VIT-02:${v.kind}`))
  if (ev) {
    const pct = Math.round(Math.abs(ev.deviationPct))
    const action = astronaut ? 'Re-measure, then notify the CMO.' : 'Ask for a re-measurement.'
    return `${VITAL_LABEL[ev.kind]} is ${pct}% ${ev.deviationPct >= 0 ? 'above' : 'below'} ${whose} baseline. ${action} ${reply}`
  }
  return `${top.title}. ${reply}`
}

function vitalCardProps(out: EngineOutput, kind: VitalKind) {
  const ev = out.vitals.find((v) => v.kind === kind)
  if (!ev) return null
  const shown = shownLevel(kind, ev.level, out.body)
  return {
    value: formatVitalValue(kind, ev.latest.value),
    status: shown,
    statusDetail: formatDeviation(ev.deviationPct),
    caption: shown === 'adapting' ? 'Measured deviation; shown as Adapting during the 3-day window.' : undefined,
    provenance: ev.latest.provenance,
  }
}

export function OverviewPage() {
  const out = useEngine()
  const environment = useAppStore((s) => s.environment)
  const role = useAppStore((s) => s.role)
  const missionDay = useAppStore((s) => s.missionDay)
  const routine = useAppStore((s) => s.routine)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const addReading = useAppStore((s) => s.addReading)
  const advanceDay = useAppStore((s) => s.advanceDay)
  const setRoutineStatus = useAppStore((s) => s.setRoutineStatus)
  const gravityChangeIso = usePhaseStore((s) => s.gravityChangeIso)
  const [selected, setSelected] = useState<MapTarget>('heart')
  const [logOpen, setLogOpen] = useState(false)

  const astronaut = role === 'ASTRONAUT'
  const env = ENVIRONMENTS[environment]
  const groundSec = 2 * env.oneWayDelaySec
  const measures = routine.filter((r) => r.kind === 'measure' && r.environments.includes(environment))
  const pending = measures.find((r) => r.status === 'due' || r.status === 'overdue')
  const logItem = pending ?? measures.find((r) => r.vital === 'heartRate') ?? null
  const shelterAlertActive = out.alerts.some((a) => a.ruleId === 'R-RAD-03')
  // Só um botão vermelho por tela (DESIGN-SYSTEM §6): durante o abrigo o primário é o procedimento;
  // se a faixa da missão já mostra o lembrete (com o primário), o "Log measurement" daqui fica secundário.
  const bannerHasPrimary = astronaut && !!pending && !shelterActive
  const logIsPrimary = astronaut && !shelterActive && !bannerHasPrimary

  const hr = vitalCardProps(out, 'heartRate')
  const sys = out.vitals.find((v) => v.kind === 'systolicBP')
  const dia = out.vitals.find((v) => v.kind === 'diastolicBP')
  const bpWorst = sys && dia ? worstLevel([sys.level, dia.level]) : null
  const bpTop = sys && dia ? (Math.abs(sys.deviationPct) >= Math.abs(dia.deviationPct) ? sys : dia) : null
  const bpShown = bpWorst && bpTop ? shownLevel(bpTop.kind, bpWorst, out.body) : null
  const dose = out.radiation
  const adh = out.exercise.adherence
  const alerts = visibleAlerts(out.alerts, out.privacy)
  const adaptationActive = inAdaptation(gravityChangeIso, simNowIso)

  const detail: Partial<Record<MapTarget, string>> = {
    radiation: shelterAlertActive
      ? 'Urgent — solar particle event, shelter active'
      : dose.pctOfLimit === null
        ? `prior career dose ${formatMSv(dose.priorMSv)} mSv; no new dose added in ${env.label}`
        : `career dose ${Math.round(dose.pctOfLimit)}% of ${dose.limitMSv} mSv`,
  }
  const sub: Partial<Record<MapTarget, string>> = {}
  for (const z of BODY_ZONES) {
    detail[z.id] = zoneDetail(z.id, out)
    sub[z.id] = zoneSub(z.id, out)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <section aria-labelledby="overview-title" className="flex flex-col gap-3">
          <DayLabel />
          <h1 id="overview-title" className="text-4xl leading-tight font-extrabold tracking-tight xl:text-5xl">
            {astronaut ? (
              <>
                Your body, day <span className="num">{missionDay}</span>.
              </>
            ) : (
              <>
                Crew member · day <span className="num">{missionDay}</span>
              </>
            )}
          </h1>
          <p className="text-lg">{headline(out, groundSec, environment === 'EARTH', astronaut)}</p>
          {!astronaut && (
            <p className="text-sm text-muted">Viewing as {ROLE_TEXT[role]}. Measurements are logged by the astronaut.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {shelterAlertActive && (
              <Button asChild>
                <a href="#/radiation" className="text-white no-underline hover:no-underline">
                  View shelter procedure
                </a>
              </Button>
            )}
            {astronaut && (
              <Button variant={logIsPrimary ? 'default' : 'outline'} onClick={() => setLogOpen(true)} disabled={!logItem}>
                Log measurement
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => advanceDay(1)}
              title="Demo control: moves the simulated mission clock forward one day (BODY-08)"
            >
              Advance day{' '}
              <span className="ml-1 rounded border border-white/30 px-1 text-[11px] uppercase tracking-wider">Demo</span>
            </Button>
            <IllustrativeThresholds />
          </div>
        </section>

        <section aria-labelledby="alerts-title" className="flex flex-col gap-3">
          <h2 id="alerts-title" className="text-lg">
            Active alerts
          </h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted">No active alerts.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-md bg-surface p-3 text-sm ${a.level === 'urgent' ? 'border border-urgent/60' : ''}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.level} />
                    <span className="font-semibold">{a.title}</span>
                  </div>
                  <p className="mt-1 text-muted">
                    {a.escalateTo.length
                      ? `Escalation: ${a.escalateTo.map((r) => (r === 'FLIGHT_SURGEON' ? 'flight surgeon' : r)).join(', ')} · ${out.escalation.replyText}`
                      : 'No escalation.'}{' '}
                    {out.vitals.some(
                      (v) => a.id.startsWith(`R-VIT-02:${v.kind}`) && shownLevel(v.kind, v.level, out.body) === 'adapting',
                    ) && <>Shown as Adapting on the body map during the adaptation window. </>}
                    <span className="num text-xs">Rule {a.ruleId}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        aria-label="Body status map"
        className="grid items-start gap-4 rounded-lg bg-surface p-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      >
        <div className="flex flex-col items-center gap-2">
          <BodyMap
            status={out.body}
            labels={ZONE_LABELS}
            detail={detail}
            sub={sub}
            radiation={{
              status: shelterAlertActive ? 'urgent' : null,
              label: shelterAlertActive
                ? 'Radiation · Urgent — shelter'
                : dose.pctOfLimit === null
                  ? 'Radiation · no new dose added'
                  : `Radiation · ${Math.round(dose.pctOfLimit)}% of career limit`,
            }}
            selected={selected}
            onSelect={setSelected}
            showLegs
            pulse
          />
          {/* Indicadores-chave logo abaixo do mapa: ocupa o espaço ao lado do card da zona (sem buraco). */}
          <section
            aria-label="Key indicators"
            className="mt-2 grid w-full gap-3 sm:grid-cols-2 [&>section]:bg-surface-2"
          >
        {hr ? (
          <MetricCard label="Heart rate · rest" unit="bpm" {...hr} />
        ) : (
          <MetricCard label="Heart rate · rest" value="—" caption="No data" provenance={{ kind: 'simulated' }} />
        )}
        {sys && dia && bpShown && bpTop ? (
          <MetricCard
            label="Blood pressure"
            value={`${formatVitalValue('systolicBP', sys.latest.value)}/${formatVitalValue('diastolicBP', dia.latest.value)}`}
            unit="mmHg"
            status={bpShown}
            statusDetail={formatDeviation(bpTop.deviationPct)}
            provenance={sys.latest.provenance}
          />
        ) : (
          <MetricCard label="Blood pressure" value="—" caption="No data" provenance={{ kind: 'simulated' }} />
        )}
        {dose.pctOfLimit === null ? (
          <MetricCard
            label="Career dose"
            value={`${formatMSv(dose.priorMSv)}`}
            unit="mSv prior"
            caption={
              <>
                {environment === 'EARTH' ? 'Not added on Earth' : `Not added ${ENV_PLACE[environment]} (rate not sourced)`}{' '}
                · limit <span className="num">{dose.limitMSv}</span> mSv{' '}
                <SourceRef ids={['S03']} />
              </>
            }
            provenance={{ kind: 'simulated', note: 'Fictional prior career dose' }}
          />
        ) : (
          <MetricCard
            label="Career dose"
            value={`${Math.round(dose.pctOfLimit)}%`}
            caption={
              <>
                <span className="num">{formatMSv(dose.totalMSv!)}</span> of <span className="num">{dose.limitMSv}</span>{' '}
                mSv <SourceRef ids={['S03']} />
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
        </div>
        <ZoneCard target={selected} out={out} mode={environment} adaptationActive={adaptationActive} />
      </section>

      {astronaut && (
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
      )}
    </div>
  )
}
