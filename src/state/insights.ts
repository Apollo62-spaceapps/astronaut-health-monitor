// Derivados de L7 (Orbit §5A/§5B): referência por ambiente, tendências e Crew outlook.
// Tudo DERIVADO da entrada/saída do motor de regras (ENV-02: nada é guardado no store; trocar de ambiente
// recalcula). `deriveInsights` é pura; `useInsights` só memoiza para as telas.
import { useMemo } from 'react'
import { SYNTHETIC_CREW } from '@/data/crew'
import { groundReplySec } from '@/domain/config/environments'
import type { EngineInput, EngineOutput } from '@/domain/rules/engine'
import { inAdaptation } from '@/domain/rules/phase'
import { careerDose } from '@/domain/rules/radiation'
import { baselineQuality, referenceFor, type BaselineQuality, type ReferenceState } from '@/domain/rules/reference'
import { crewOutlook, type CrewMemberInput, type CrewOutlook } from '@/domain/rules/risk'
import { detectTrend, trendFromSeries, type Trend } from '@/domain/rules/trend'
import { vitalLevel } from '@/domain/rules/vitals'
import { VITAL_KINDS, type VitalKind } from '@/domain/types'
import { useEngine, useEngineInput } from '@/state/useEngine'

export interface Insights {
  quality: Partial<Record<VitalKind, BaselineQuality>>
  references: Partial<Record<VitalKind, ReferenceState>>
  trends: Trend[]
  /** Dentro da janela de adaptação à gravidade (R-PHASE-01). */
  adapting: boolean
  /** Crew A (o astronauta do cenário) + tripulação sintética. Ainda SEM o filtro de privacidade (ver viewOutlook). */
  crew: CrewOutlook[]
}

const DAY_MS = 24 * 60 * 60 * 1000
export const SELF_CREW_ID = 'A'

export function deriveInsights(input: EngineInput, out: EngineOutput): Insights {
  const now = input.simNowIso
  const quality: Insights['quality'] = {}
  const references: Insights['references'] = {}
  const trends: Trend[] = []
  for (const kind of VITAL_KINDS) {
    const q = baselineQuality(kind, input.preflight)
    if (q) quality[kind] = q
    const ref = referenceFor({
      kind,
      preflight: input.preflight,
      readings: input.vitals,
      environment: input.environment,
      nowIso: now,
      gravityChangeIso: input.gravityChangeIso,
    })
    if (!ref) continue
    references[kind] = ref
    const t = detectTrend(kind, input.vitals, now, {
      value: ref.referenceValue,
      comparedTo: ref.origin === 'adapted' ? 'adapted' : 'preflight',
    })
    if (t) trends.push(t)
  }

  const adapting = inAdaptation(input.gravityChangeIso, now)
  const solarEventActive = out.alerts.some((a) => a.ruleId === 'R-RAD-03')
  const replySec = groundReplySec(input.environment)
  const today = now.slice(0, 10)
  const recentWellbeing = [...input.wellbeing]
    .filter((w) => w.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-3)
  const weekAgo = new Date(Date.parse(now) - 7 * DAY_MS).toISOString().slice(0, 10)
  const hr = out.vitals.find((v) => v.kind === 'heartRate')

  const self: CrewMemberInput = {
    id: SELF_CREW_ID,
    name: 'Crew A',
    isSelf: true,
    hr: hr ? { latest: hr.latest.value, preflightMean: hr.baseline.preflightMean, level: hr.level } : undefined,
    trend: trends.find((t) => t.kind === 'heartRate') ?? null,
    sleepHours: recentWellbeing.map((w) => w.sleepHours),
    mood: recentWellbeing.map((w) => w.mood),
    dosePct: out.radiation.pctOfLimit,
    solarEventActive,
    adherencePct: out.exercise.adherence.pct,
    postponedSessions: out.exercise.sessions.filter(
      (s) => s.status === 'postponed' && s.date > weekAgo && s.date <= today,
    ).length,
    groundReplySec: replySec,
    adapting,
    provenance: 'SIMULATED',
  }

  const others: CrewMemberInput[] = SYNTHETIC_CREW.map((c) => {
    const latest = c.hr.series.at(-1)!
    const dev = ((latest - c.hr.preflightMean) / c.hr.preflightMean) * 100
    return {
      id: c.id,
      name: c.name,
      isSelf: false,
      hr: { latest, preflightMean: c.hr.preflightMean, level: vitalLevel('heartRate', dev) },
      trend: trendFromSeries('heartRate', c.hr.series, { value: c.hr.preflightMean, comparedTo: 'preflight' }),
      sleepHours: c.sleepHours,
      mood: c.mood,
      dosePct: careerDose(
        { careerPriorMSv: c.careerPriorMSv, missionDayRateMSv: null, careerLimitMSv: 600 },
        input.missionDay,
        input.environment,
      ).pctOfLimit,
      solarEventActive,
      adherencePct: c.adherencePct,
      postponedSessions: c.postponedSessions + (solarEventActive ? (self.postponedSessions ?? 0) : 0),
      groundReplySec: replySec,
      adapting,
      provenance: 'SIMULATED',
    }
  })

  return { quality, references, trends, adapting, crew: [self, ...others].map(crewOutlook) }
}

/** Derivados para as telas (memoizados a partir do motor de regras). */
export function useInsights(): Insights {
  const input = useEngineInput()
  const out = useEngine()
  return useMemo(() => deriveInsights(input, out), [input, out])
}
