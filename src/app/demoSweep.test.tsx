// @vitest-environment jsdom
// K8 #50 — varredura da demo: renderiza TODAS as abas em todos os perfis e ambientes e confere
// as regras inegociáveis que dá para checar automaticamente (CLAUDE.md §0, DESIGN-SYSTEM §6).
// Se este teste falhar, a tela que quebrou aparece no nome do caso: "<aba> · <perfil> · <ambiente>".
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import App from '@/app/App'
import { DISCLAIMER } from '@/app/AppShell'
import { TABS } from '@/app/tabs'
import type { MissionMode, Role } from '@/domain/types'
import { useAppStore } from '@/state/store'

const ROLES: Role[] = ['ASTRONAUT', 'CMO', 'FLIGHT_SURGEON']
const ENVIRONMENTS: MissionMode[] = ['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT']

// BODY-07 / CLAUDE.md §0.2. "Prescribed by ASCR team (simulated)" é texto exigido (EX-01), então
// "prescri…" fica de fora; o rodapé "not for diagnosis" é removido antes da checagem.
const FORBIDDEN_UI = /\b(fit|unfit|healthy|apto|diagnos\w*)\b/i

beforeEach(() => {
  localStorage.clear()
  useAppStore.getState().resetScenario()
  useAppStore.setState({ aiMode: 'protocol' })
})

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

function renderTab(tab: string, role: Role, environment: MissionMode) {
  useAppStore.setState({ role, environment })
  window.location.hash = `/${tab}`
  return render(<App />)
}

describe('varredura da demo (K8)', () => {
  for (const tab of TABS) {
    for (const role of ROLES) {
      for (const environment of ENVIRONMENTS) {
        it(`${tab.id} · ${role} · ${environment}`, () => {
          const { container } = renderTab(tab.id, role, environment)
          const text = container.textContent ?? ''

          // NFR-08: rodapé fixo em toda tela.
          expect(text).toContain(DISCLAIMER)

          // BODY-07: nunca "fit", "healthy", "apto" nem diagnóstico.
          const match = text.replace(DISCLAIMER, '').match(FORBIDDEN_UI)
          expect(match?.[0], `palavra proibida na UI: "${match?.[0]}"`).toBeUndefined()

          // DESIGN-SYSTEM §3/§6: no máximo uma ação primária vermelha por tela.
          const primaries = container.querySelectorAll('[data-slot="button"][data-variant="default"]')
          const labels = [...primaries].map((b) => b.textContent?.trim())
          expect(primaries.length, `botões primários: ${labels.join(' | ')}`).toBeLessThanOrEqual(1)
        })
      }
    }
  }
})
