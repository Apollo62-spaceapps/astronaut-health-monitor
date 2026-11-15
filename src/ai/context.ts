// O que o Orbit LÊ (L7). Montado a partir do motor de regras e dos derivados, já com a privacidade do perfil:
// o Orbit não reconstrói o que foi omitido (R-PRIV-01) e diz o que não pode ver. Função PURA.
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import { visibleAlerts, type EngineInput, type EngineOutput } from '@/domain/rules/engine'
import type { EscalationDecision } from '@/domain/rules/escalation'
import { accessLevel, type AccessLevel } from '@/domain/rules/privacy'
import type { CareerDose } from '@/domain/rules/radiation'
import { viewOutlook, type VisibleOutlook } from '@/domain/rules/risk'
import type { BaselineQuality, ReferenceState } from '@/domain/rules/reference'
import { dailyValues, type Trend } from '@/domain/rules/trend'
import type { VitalEvaluation } from '@/domain/rules/vitals'
import type {
  Alert,
  AlertLevel,
  BodyZoneId,
  MissionMode,
  OutboundPacket,
  Role,
  RoutineItem,
  SpaceWeatherEvent,
  VitalKind,
  WellbeingEntry,
  ZoneStatus,
} from '@/domain/types'
import { VITAL_KINDS } from '@/domain/types'
import { blackoutPossible } from '@/features/escalation/blackout'
import type { Insights } from '@/state/insights'

export interface OrbitContext {
  role: Role
  environment: MissionMode
  envLabel: string
  missionDay: number
  simNowIso: string
  groundReplySec: number
  blackoutPossible: boolean
  /** Alertas que o perfil pode ver, do mais grave ao menos grave. */
  alerts: Alert[]
  worstLevel: AlertLevel
  escalation: EscalationDecision
  vitals: VitalEvaluation[]
  /** Status das zonas já com privacidade e fase (R-BODY-01, R-PHASE-01). */
  body: Record<BodyZoneId, ZoneStatus | null>
  radiation: CareerDose
  shelterActive: boolean
  event?: SpaceWeatherEvent
  exercise: { adherencePct: number | null; streakDays: number; postponed: number }
  /** Rotina do ambiente atual. */
  routine: RoutineItem[]
  outbox: OutboundPacket[]
  /** Bem-estar: só quando o perfil pode ver o detalhe. */
  wellbeing: WellbeingEntry[] | null
  access: Record<'vitals' | 'radiation' | 'exerciseAdherence' | 'wellbeingDetail' | 'wellbeingAlert', AccessLevel>
  adapting: boolean
  quality: Partial<Record<VitalKind, BaselineQuality>>
  references: Partial<Record<VitalKind, ReferenceState>>
  trends: Trend[]
  crew: VisibleOutlook[]
  /** L8: um valor por dia (última leitura do dia), 14 dias até agora, por indicador. */
  history: Partial<Record<VitalKind, { day: string; value: number }[]>>
}

export interface OrbitExtras {
  routine: readonly RoutineItem[]
  outbox: readonly OutboundPacket[]
}

export function buildOrbitContext(
  input: EngineInput,
  out: EngineOutput,
  insights: Insights,
  extras: OrbitExtras,
): OrbitContext {
  const p = out.privacy
  const access = {
    vitals: accessLevel('vitals', p),
    radiation: accessLevel('radiation', p),
    exerciseAdherence: accessLevel('exerciseAdherence', p),
    wellbeingDetail: accessLevel('wellbeingDetail', p),
    wellbeingAlert: accessLevel('wellbeingAlert', p),
  }
  const today = input.simNowIso.slice(0, 10)
  return {
    role: input.role,
    environment: input.environment,
    envLabel: ENVIRONMENTS[input.environment].label,
    missionDay: input.missionDay,
    simNowIso: input.simNowIso,
    groundReplySec: groundReplySec(input.environment),
    blackoutPossible: blackoutPossible(input.environment),
    alerts: visibleAlerts(out.alerts, p),
    worstLevel: out.worstLevel,
    escalation: out.escalation,
    vitals: out.vitals,
    body: out.body,
    radiation: out.radiation,
    shelterActive: out.alerts.some((a) => a.ruleId === 'R-RAD-03'),
    event: input.eventReplayed && input.spaceWeatherEvent ? input.spaceWeatherEvent : undefined,
    exercise: {
      adherencePct: out.exercise.adherence.pct,
      streakDays: out.exercise.streakDays,
      postponed: out.exercise.sessions.filter((s) => s.status === 'postponed' && s.date === today).length,
    },
    routine: extras.routine.filter((r) => r.environments.includes(input.environment)),
    outbox: [...extras.outbox],
    wellbeing: access.wellbeingDetail === 'full' ? [...input.wellbeing] : null,
    access,
    adapting: insights.adapting,
    quality: insights.quality,
    references: insights.references,
    trends: insights.trends,
    crew: insights.crew.map((o) => viewOutlook(o, p)),
    history: Object.fromEntries(VITAL_KINDS.map((k) => [k, dailyValues(k, input.vitals, input.simNowIso, 14)])),
  }
}
