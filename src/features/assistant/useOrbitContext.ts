// Contexto que o Orbit lê (L7), memoizado a partir do motor de regras. Só as telas e o runtime do Orbit (lazy) usam.
import { useMemo } from 'react'
import { buildOrbitContext, type OrbitContext } from '@/ai/context'
import { useAppStore } from '@/state/store'
import { useEngine, useEngineInput } from '@/state/useEngine'
import { useInsights } from '@/state/insights'

export function useOrbitContext(): OrbitContext {
  const input = useEngineInput()
  const out = useEngine()
  const insights = useInsights()
  const routine = useAppStore((s) => s.routine)
  const outbox = useAppStore((s) => s.outbox)
  return useMemo(
    () => buildOrbitContext(input, out, insights, { routine, outbox }),
    [input, out, insights, routine, outbox],
  )
}
