import { useEffect } from 'react'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { useAppStore } from '@/state/store'

/**
 * Aplica o modo de ambiente no <html data-environment="…">.
 * Isso troca só a cor da faixa da missão (DESIGN-SYSTEM §5). O visual escuro não muda.
 */
export function useEnvironmentAttribute() {
  const environment = useAppStore((s) => s.environment)
  useEffect(() => {
    document.documentElement.dataset.environment = ENVIRONMENTS[environment].themeToken
  }, [environment])
}
