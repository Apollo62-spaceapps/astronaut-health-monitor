// Liga o motor de regras (src/domain/rules/engine.ts) ao store.
// - useEngine(): saída do motor para as telas (memoizada a partir do store).
// - useRulesEngineSync(): grava os alertas no store sempre que o resultado muda (só as regras escrevem `alerts`).
import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { runEngine, type EngineInput, type EngineOutput } from '@/domain/rules/engine'
import { useAppStore, type AppState } from '@/state/store'

const pickInput = (s: AppState): EngineInput => ({
  environment: s.environment,
  role: s.role,
  vitals: s.vitals,
  preflight: s.preflight,
  wellbeing: s.wellbeing,
  exercise: s.exercise,
  radiation: s.radiation,
  missionDay: s.missionDay,
  simNowIso: s.simNowIso,
  spaceWeatherEvent: s.spaceWeatherEvent,
  eventReplayed: s.eventReplayed,
  shelterActive: s.shelterActive,
  consent: s.consent,
  breakGlass: s.breakGlass,
})

/** Entrada do motor lida do store. */
export function useEngineInput(): EngineInput {
  return useAppStore(useShallow(pickInput))
}

/** Saída do motor de regras para as telas. */
export function useEngine(): EngineOutput {
  const input = useEngineInput()
  return useMemo(() => runEngine(input), [input])
}

/** Assinatura que muda só quando o conjunto de alertas muda (evita regravar o store a cada tick do relógio). */
const signature = (alerts: EngineOutput['alerts']) =>
  alerts.map((a) => `${a.id}|${a.level}|${a.escalateTo.join(',')}`).join(';')

/** Monte uma vez (no App): mantém `store.alerts` igual à saída do motor. */
export function useRulesEngineSync(): void {
  const { alerts } = useEngine()
  const setAlerts = useAppStore((s) => s.setAlerts)
  const sig = signature(alerts)
  useEffect(() => {
    if (signature(useAppStore.getState().alerts) !== sig) setAlerts(alerts)
    // `sig` resume `alerts`; não regravar a cada nova referência.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, setAlerts])
}
