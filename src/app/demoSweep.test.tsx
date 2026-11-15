// @vitest-environment jsdom
// K8 #50 — varredura da demo: renderiza TODAS as abas em todos os perfis e ambientes e confere
// as regras inegociáveis que dá para checar automaticamente (CLAUDE.md §0, DESIGN-SYSTEM §9).
// Se este teste falhar, a tela que quebrou aparece no nome do caso: "<aba> · <perfil> · <ambiente>".
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

          // DESIGN-SYSTEM §4/§9: no máximo uma ação primária vermelha por tela.
          const primaries = container.querySelectorAll('[data-slot="button"][data-variant="default"]')
          const labels = [...primaries].map((b) => b.textContent?.trim())
          expect(primaries.length, `botões primários: ${labels.join(' | ')}`).toBeLessThanOrEqual(1)
        })
      }
    }
  }
})

const primaryLabels = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-slot="button"][data-variant="default"]')].map((b) => b.textContent?.trim())

describe('roteiro da demo (K8, SPEC §10)', () => {
  it('Demo controls aberto continua com no máximo um botão vermelho (DEMO-01)', () => {
    const { container } = renderTab('sources', 'ASTRONAUT', 'SPACECRAFT')
    fireEvent.click(screen.getByRole('button', { name: /demo controls/i }))
    expect(screen.getByText(/Replay solar event · demo/)).toBeTruthy()
    expect(primaryLabels(container).length, primaryLabels(container).join(' | ')).toBeLessThanOrEqual(1)
  })

  it('exercício segue o ambiente: aparelhos com fonte só na Space Station (§5.1, P-18)', () => {
    renderTab('exercise', 'ASTRONAUT', 'ISS')
    expect(screen.getAllByText(/ARED/).length).toBeGreaterThan(0)
    cleanup()
    const { container } = renderTab('exercise', 'ASTRONAUT', 'LUNAR')
    expect(container.textContent).toMatch(/simulated habitat equipment/i)
    expect(container.textContent).not.toMatch(/Advanced Resistive Exercise Device/)
  })

  it('passo 5: CMO vê o bem-estar bloqueado, faz break-glass e o acesso aparece na auditoria (PRIV-02/03/04)', () => {
    const { container } = renderTab('wellbeing', 'CMO', 'SPACECRAFT')
    expect(container.textContent).toContain('Restricted — private medical data')
    expect(container.textContent).not.toContain('Last 14 days')

    useAppStore.getState().breakGlassAccess('Crew member unresponsive during shelter')
    cleanup()
    const cmo = renderTab('wellbeing', 'CMO', 'SPACECRAFT')
    expect(cmo.container.textContent).toContain('Last 14 days')
    expect(cmo.container.textContent).toContain('reason: Crew member unresponsive during shelter')

    cleanup()
    const astronaut = renderTab('wellbeing', 'ASTRONAUT', 'SPACECRAFT')
    expect(astronaut.container.textContent).toContain('CMO accessed your wellbeing data')
    expect(screen.getByRole('list', { name: 'Audit log entries' })).toBeTruthy()
  })
})
