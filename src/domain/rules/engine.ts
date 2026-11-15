// Motor de regras (SPEC §7): junta R-VIT, R-MH, R-RAD, R-EX, R-ESC, R-BODY e R-PRIV.
// Entrada = dados do cenário + ambiente + relógio simulado + privacidade. Saída = Alert[] (cada um com ruleId)
// e os valores que as telas exibem. Função PURA: sem React, sem store, sem Date.now().
// A LLM só LÊ o AssistantContext montado aqui e nunca altera alertas (AI-07).
import type {
  Alert,
  AlertLevel,
  AssistantContext,
  ExerciseSession,
  MissionMode,
  RadiationState,
  Role,
  SpaceWeatherEvent,
  VitalReading,
  WellbeingEntry,
} from '@/domain/types'
import { VITAL_KINDS } from '@/domain/types'
import { evaluateVitals, vitalAlert, type VitalEvaluation, ALERT_LEVEL_ORDER } from '@/domain/rules/vitals'
import { evaluateWellbeing, wellbeingAlert, type WellbeingEvaluation } from '@/domain/rules/wellbeing'
import { careerDose, shelterAlert, type CareerDose } from '@/domain/rules/radiation'
import { applyShelter, streakDays, weeklyAdherence, type Adherence } from '@/domain/rules/exercise'
import { escalate, type EscalationDecision } from '@/domain/rules/escalation'
import { bodyStatus, type IndicatorLevels } from '@/domain/rules/body'
import { canView, type PrivacyContext } from '@/domain/rules/privacy'
import type { BodyZoneId, ZoneStatus } from '@/domain/types'

export interface EngineInput {
  environment: MissionMode
  role: Role
  vitals: readonly VitalReading[]
  preflight: readonly VitalReading[]
  wellbeing: readonly WellbeingEntry[]
  exercise: readonly ExerciseSession[]
  radiation: RadiationState
  missionDay: number
  /** Relógio simulado (store.simNowIso). */
  simNowIso: string
  spaceWeatherEvent: SpaceWeatherEvent | null
  eventReplayed: boolean
  shelterActive: boolean
  consent: { shareWellbeingAlertsWithCmo: boolean }
  breakGlass: { active: boolean }
}

export interface EngineOutput {
  /** Todos os alertas, do mais grave ao menos grave. Filtre por perfil com `visibleAlerts` antes de exibir. */
  alerts: Alert[]
  vitals: VitalEvaluation[]
  wellbeing: WellbeingEvaluation | null
  radiation: CareerDose
  exercise: { sessions: ExerciseSession[]; adherence: Adherence; streakDays: number }
  indicatorLevels: IndicatorLevels
  /** Status de cada zona do mapa do corpo, já com a privacidade do perfil aplicada (R-BODY-01). */
  body: Record<BodyZoneId, ZoneStatus | null>
  /** Pior nível dos alertas visíveis ao perfil + decisão de escalonamento (R-ESC-01). */
  worstLevel: AlertLevel
  escalation: EscalationDecision
  privacy: PrivacyContext
}

const rank = (l: AlertLevel) => ALERT_LEVEL_ORDER.indexOf(l)

export function privacyOf(input: Pick<EngineInput, 'role' | 'consent' | 'breakGlass'>): PrivacyContext {
  return {
    role: input.role,
    consentShareWellbeingAlerts: input.consent.shareWellbeingAlertsWithCmo,
    breakGlassActive: input.breakGlass.active,
  }
}

/** Alertas que o perfil pode ver: o de bem-estar (R-MH-01) segue a matriz §6.7. */
export function visibleAlerts(alerts: readonly Alert[], privacy: PrivacyContext): Alert[] {
  return alerts.filter((a) => a.ruleId !== 'R-MH-01' || canView('wellbeingAlert', privacy))
}

export function runEngine(input: EngineInput): EngineOutput {
  const now = input.simNowIso
  const privacy = privacyOf(input)

  // R-VIT-01/02
  const vitals = evaluateVitals(VITAL_KINDS, input.vitals, input.preflight, now)
  // R-MH-01 (P1)
  const wellbeing = evaluateWellbeing(input.wellbeing, now)
  // R-RAD-01/02
  const radiation = careerDose(input.radiation, input.missionDay, input.environment)
  // R-EX-02 e R-EX-01
  const sessions = applyShelter(input.exercise, now, input.shelterActive)
  const adherence = weeklyAdherence(sessions, now)

  const raw: Alert[] = []
  for (const ev of vitals) {
    const a = vitalAlert(ev, now)
    if (a) raw.push(a)
  }
  if (wellbeing) {
    const a = wellbeingAlert(wellbeing, now)
    if (a) raw.push(a)
  }
  // R-RAD-03
  const shelter = shelterAlert(input.spaceWeatherEvent, input.eventReplayed && input.shelterActive, now)
  if (shelter) raw.push(shelter)

  // R-ESC-01: destinatários por nível + ambiente. Bem-estar só vai ao CMO com consentimento (MH-04).
  const alerts = raw
    .map((a) => {
      let escalateTo = escalate(a.level, input.environment).escalateTo
      if (a.ruleId === 'R-MH-01' && !input.consent.shareWellbeingAlertsWithCmo)
        escalateTo = escalateTo.filter((r) => r !== 'CMO')
      return { ...a, escalateTo }
    })
    .sort((a, b) => rank(b.level) - rank(a.level))

  // Níveis por indicador → mapa do corpo (R-BODY-01)
  const indicatorLevels: IndicatorLevels = {}
  for (const ev of vitals) indicatorLevels[ev.kind] = ev.level
  if (wellbeing) {
    indicatorLevels.mood = wellbeing.mood
    indicatorLevels.sleep = wellbeing.sleep
  }
  const body = bodyStatus(indicatorLevels, privacy)

  const visible = visibleAlerts(alerts, privacy)
  const worstLevel = visible.reduce<AlertLevel>((w, a) => (rank(a.level) > rank(w) ? a.level : w), 'normal')

  return {
    alerts,
    vitals,
    wellbeing,
    radiation,
    exercise: { sessions, adherence, streakDays: streakDays(sessions, now) },
    indicatorLevels,
    body,
    worstLevel,
    escalation: escalate(worstLevel, input.environment),
    privacy,
  }
}

/**
 * Contexto do assistente, montado pelas regras (AI-07, ENV-05).
 * Só leva os alertas que o perfil pode ver (o assistente do CMO não recebe o alerta de bem-estar sem consentimento).
 */
export function buildAssistantContext(input: EngineInput, out: EngineOutput = runEngine(input)): AssistantContext {
  return {
    missionMode: input.environment,
    activeAlerts: visibleAlerts(out.alerts, out.privacy),
    vitalsSummary: out.vitals.map((v) => ({
      kind: v.kind,
      deviationPct: Math.round(v.deviationPct * 10) / 10,
      status: v.level,
    })),
    activeEvent: input.eventReplayed && input.spaceWeatherEvent ? input.spaceWeatherEvent : undefined,
  }
}
