// Troca do motor do assistente (AI-03), usada pela aba Assistant e pelo painel Demo controls (DEMO-01).
// Trocar para o modelo de bordo SEMPRE passa pelo init(): a faixa só diz "AI: onboard model"
// depois que o modelo carregou. Sem WebGPU, com ?ai=protocol ou se o init falhar, fica em protocolo.
import { useState } from 'react'
import { canUseOnboardModel, engineFor } from '@/ai/engine'
import type { AiMode } from '@/domain/types'
import { useAppStore } from '@/state/store'

export function useAiEngineSwitch() {
  const aiMode = useAppStore((s) => s.aiMode)
  const setAiMode = useAppStore((s) => s.setAiMode)
  const [loading, setLoading] = useState<{ p: number; text: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const switchTo = async (mode: AiMode) => {
    setNotice(null)
    if (mode === 'protocol') return setAiMode('protocol')
    if (!canUseOnboardModel()) {
      setNotice('WebGPU is not available here (or ?ai=protocol is set) — staying in protocol mode.')
      return setAiMode('protocol')
    }
    try {
      setLoading({ p: 0, text: 'Loading onboard model…' })
      await engineFor('onboard-model').init((p, text) => setLoading({ p, text }))
      setAiMode('onboard-model')
    } catch {
      setNotice('The onboard model could not start — protocol mode is active. The alerts do not change.')
      setAiMode('protocol')
    } finally {
      setLoading(null)
    }
  }

  return { aiMode, switchTo, loading, notice, setNotice }
}
