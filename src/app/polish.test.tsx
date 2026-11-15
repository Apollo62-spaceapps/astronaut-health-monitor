// @vitest-environment jsdom
// Polimento final (15/11): contradições de conteúdo que um jurado notaria e regras do design system.
import indexHtml from '../../index.html?raw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '@/app/App'
import { TABS } from '@/app/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RoutinePage } from '@/features/routine/RoutinePage'
import type { MissionMode, Role } from '@/domain/types'
import { useAppStore } from '@/state/store'

beforeEach(() => {
  localStorage.clear()
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})
afterEach(() => {
  cleanup()
  window.location.hash = ''
})

function renderTab(tab: string, role: Role = 'ASTRONAUT', environment: MissionMode = 'SPACECRAFT') {
  useAppStore.setState({ role, environment })
  window.location.hash = `/${tab}`
  return render(<App />)
}

// A aba Routine saiu do menu (decisão do time, 15/11), mas a RoutinePage segue no código e a
// rotina ainda alimenta o lembrete da faixa; os testes de CORE-07 renderizam a tela direto.
function renderRoutine(role: Role = 'ASTRONAUT') {
  useAppStore.setState({ role, environment: 'SPACECRAFT' })
  return render(
    <TooltipProvider>
      <RoutinePage />
    </TooltipProvider>,
  )
}

const primaries = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-slot="button"][data-variant="default"]')].map((b) => b.textContent?.trim())

describe('index.html', () => {
  it('está em inglês (lang="en", título e descrição)', () => {
    const html = indexHtml
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<title>Apollo 62 · Astronaut health monitor (prototype)</title>')
    expect(html).not.toMatch(/SIMULADO|Monitor de saúde/)
  })
})

describe('um primário por tela com o abrigo ativo (DESIGN-SYSTEM §6)', () => {
  for (const tab of TABS) {
    for (const role of ['ASTRONAUT', 'CMO'] as Role[]) {
      it(`${tab.id} · ${role} · abrigo ativo`, () => {
        useAppStore.getState().replaySolarEvent()
        const { container } = renderTab(tab.id, role)
        expect(primaries(container).length, primaries(container).join(' | ')).toBeLessThanOrEqual(1)
      })
    }
  }

  it('com o lembrete na faixa, a Overview não repete o primário', () => {
    useAppStore.getState().advanceDay(1) // medições do dia novo vencem → lembrete na faixa
    const { container } = renderTab('overview')
    expect(primaries(container)).toEqual(['Log measurement'])
  })
})

describe('exercício durante o abrigo (R-EX-02)', () => {
  it('sessão adiada nunca aparece também como "Done"', () => {
    useAppStore.getState().replaySolarEvent()
    const { container } = renderTab('exercise', 'ASTRONAUT', 'ISS')
    const sessions = [...container.querySelectorAll('section')].filter((s) => s.textContent?.includes('Postponed'))
    expect(sessions.length).toBe(3)
    for (const s of sessions) expect(s.textContent).not.toContain('Done')
    expect(container.textContent).toContain('Plan from the ASCR team (simulated).')
    expect(container.textContent).not.toContain('Prescribed by')
  })
})

describe('rotina coerente com as leituras (CORE-07)', () => {
  it('com leitura de hoje o status é Done, com horário; pressão como sistólica/diastólica', () => {
    const { container } = renderRoutine()
    expect(container.textContent).not.toContain('Overdue')
    expect(container.textContent).toContain('121/79 mmHg')
    expect(container.textContent).toContain('today, 07:30 UTC')
  })
})

describe('perfis (CMO / Flight Surgeon)', () => {
  it('Wellbeing do CMO se chama "Crew wellbeing"', () => {
    renderTab('wellbeing', 'CMO')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Crew wellbeing')
  })

  it('CMO não vê ação de registrar medida na rotina', () => {
    useAppStore.getState().advanceDay(1)
    renderRoutine('CMO')
    expect(screen.queryByRole('button', { name: 'Log measurement' })).toBeNull()
  })
})

describe('assistente', () => {
  it('protocol mode não se diz "AI-generated"', async () => {
    renderTab('assistant')
    // A tela do Orbit é carregada sob demanda (L7): espera os chips aparecerem.
    const chips = await screen.findAllByRole('button', { name: /\?$/ })
    fireEvent.click(chips.find((b) => b.className.includes('rounded-full'))!)
    expect(await screen.findByText('Rule-based response · Protocol mode')).toBeTruthy()
    expect(document.body.textContent).not.toContain('AI-generated')
  })
})

describe('sem sobras de desenvolvimento na tela', () => {
  for (const tab of TABS) {
    it(`${tab.id}: sem enum cru, IDs de pendência ou notas internas`, () => {
      useAppStore.getState().replaySolarEvent()
      const { container } = renderTab(tab.id)
      // O ID oficial do evento DONKI ("2024-05-11T02:10:00-SEP-001") é um identificador, não uma data exibida.
      const text = (container.textContent ?? '').replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-SEP-\d+/g, '')
      expect(text).not.toMatch(/FLIGHT_SURGEON|\(P-\d+\)|· P-\d+|SRC-0\d|Calculated by R-|Verify|check the exact value/)
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) // datas cruas ISO
    })
  }
})
