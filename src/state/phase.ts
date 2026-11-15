// Rastreia a última troca de campo gravitacional (R-PHASE-01, BODY-09, P1).
// Fica fora do store principal para não mudar o contrato (K2): só observa `environment` e `simNowIso`.
import { create } from 'zustand'
import { gravityChanged } from '@/domain/rules/phase'
import { useAppStore } from '@/state/store'

interface PhaseState {
  /** Momento (relógio simulado) da última troca de gravidade; null = nenhuma nesta sessão. */
  gravityChangeIso: string | null
}

export const usePhaseStore = create<PhaseState>()(() => ({ gravityChangeIso: null }))

// Trocar de ambiente com gravidade diferente marca o início da adaptação.
// Voltar o relógio (Reset scenario) limpa a marca.
useAppStore.subscribe((s, prev) => {
  if (s.environment !== prev.environment && gravityChanged(prev.environment, s.environment)) {
    usePhaseStore.setState({ gravityChangeIso: s.simNowIso })
  } else if (Date.parse(s.simNowIso) < Date.parse(prev.simNowIso)) {
    usePhaseStore.setState({ gravityChangeIso: null })
  }
})
