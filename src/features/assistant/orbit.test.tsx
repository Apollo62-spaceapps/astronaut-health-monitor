// @vitest-environment jsdom
// L7 §13: interface do Orbit — marca, cartão de resposta, gaveta global e página.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '@/app/App'
import { useAppStore } from '@/state/store'
import { OrbitMark } from '@/features/assistant/OrbitMark'
import { ReplyCard } from '@/features/assistant/ReplyCard'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { orbitProtocolAnswer } from '@/ai/engine'
import { testContext } from '@/ai/orbitTestUtils'

beforeEach(() => {
  localStorage.clear()
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
  useOrbitStore.setState({ open: false, messages: [], pending: null, busy: false, measure: null, packet: null })
})
afterEach(() => {
  cleanup()
  window.location.hash = ''
  // @ts-expect-error limpa o mock de matchMedia
  delete window.matchMedia
})

const reducedMotion = (on: boolean) => {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes('reduce'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
}

describe('OrbitMark', () => {
  it('3 tamanhos, sem texto nem cor de status embutidos', () => {
    for (const [size, px] of [
      ['sm', '24'],
      ['md', '40'],
      ['lg', '96'],
    ] as const) {
      const { container } = render(<OrbitMark size={size} />)
      const svg = container.querySelector('svg')!
      expect(svg.getAttribute('width')).toBe(px)
      expect(svg.getAttribute('aria-label')).toBe('Orbit')
      expect(svg.textContent).toBe('')
      expect(svg.outerHTML).not.toMatch(/text-(normal|attention|urgent)|#3ddc97|#f5b83d|#ff6b63/i)
      cleanup()
    }
  })
  it('thinking anima; com prefers-reduced-motion fica parado', () => {
    reducedMotion(false)
    const { container, rerender } = render(<OrbitMark state="thinking" />)
    expect(container.querySelector('[data-testid="orbit-satellite-moving"]')).not.toBeNull()
    cleanup()
    reducedMotion(true)
    const r2 = render(<OrbitMark state="thinking" />)
    expect(r2.container.querySelector('[data-testid="orbit-satellite-moving"]')).toBeNull()
    expect(r2.container.querySelector('animateMotion')).toBeNull()
    void rerender
  })
  it('decorativo ao lado do nome: aria-hidden', () => {
    const { container } = render(<OrbitMark decorative />)
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('ReplyCard', () => {
  const ctx = testContext()
  it('lê como texto corrido com fontes; passos, ações e "Data and details", com uma só ação primária', () => {
    const reply = orbitProtocolAnswer(ctx, {
      text: 'Why is my heart zone attention?',
      intent: 'zoneExplain',
      zone: 'heart',
    })
    const { container } = render(
      <ReplyCard reply={reply} role="ASTRONAUT" shelterActive={false} latest at={ctx.simNowIso} />,
    )
    expect(screen.getByText(/Heart shows Attention because your resting heart rate is 84 bpm/)).toBeTruthy()
    for (const t of ['Step by step', 'Data and details', 'Notify the CMO']) expect(screen.getByText(t)).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Source S19' }).length).toBeGreaterThan(0)
    expect(screen.getByText(/Consulted onboard/)).toBeTruthy()
    expect(container.querySelectorAll('[data-variant="default"]')).toHaveLength(1)
    expect(screen.getByText('Rule-based response · Protocol mode')).toBeTruthy()
    expect(screen.getAllByText('SIMULATED').length).toBeGreaterThan(0)
  })
  it('cartão antigo (não o mais recente) não tem primária', () => {
    const reply = orbitProtocolAnswer(ctx, { text: 'What should I do now?' })
    const { container } = render(
      <ReplyCard reply={reply} role="ASTRONAUT" shelterActive={false} latest={false} at={ctx.simNowIso} />,
    )
    expect(container.querySelectorAll('[data-variant="default"]')).toHaveLength(0)
  })
})

describe('gaveta global e página', () => {
  it('botão Orbit abre a gaveta; Esc fecha e o foco volta ao botão', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^Orbit$/ }))
    const drawer = await screen.findByRole('dialog', { name: 'Orbit' })
    expect(drawer.getAttribute('aria-modal')).toBe('false')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Orbit' })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Orbit$/ })))
  })

  it('atalho A abre a gaveta (fora de campo de texto)', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'a' })
    expect(await screen.findByRole('dialog', { name: 'Orbit' })).toBeTruthy()
  })

  it('"Explain with Orbit" no cartão da zona responde com a explicação, sem mudar os alertas (AI-07)', async () => {
    render(<App />)
    const alertsBefore = JSON.stringify(useAppStore.getState().alerts)
    fireEvent.click(screen.getByRole('button', { name: /Explain with Orbit/ }))
    const drawer = await screen.findByRole('dialog', { name: 'Orbit' })
    // O resumo aparece no cartão e na região aria-live (leitor de tela).
    expect((await within(drawer).findAllByText(/Attention starts at 10% and Urgent at 25%/)).length).toBeGreaterThan(0)
    expect(JSON.stringify(useAppStore.getState().alerts)).toBe(alertsBefore)
    expect(useAppStore.getState().outbox).toHaveLength(0)
  })

  it('página Orbit em protocol mode não usa a rede; o pacote só entra na fila depois de confirmar', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    window.location.hash = '/assistant'
    render(<App />)
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Orbit')
    fireEvent.change(screen.getByLabelText('Message Orbit'), { target: { value: 'Prepare a message for the CMO' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    const card = await screen.findByRole('article', { name: /I drafted a message for the CMO/ })
    expect(useAppStore.getState().outbox).toHaveLength(0)
    // As ações aparecem quando o texto termina de ser escrito.
    fireEvent.click(await within(card).findByRole('button', { name: /Notify CMO/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Queue for CMO' }))
    await waitFor(() => expect(useAppStore.getState().outbox).toHaveLength(1))
    expect(useAppStore.getState().outbox[0]!.summary).toMatch(/Drafted by Orbit, confirmed by you/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('triagem: "I feel dizzy" abre o fluxo guiado sem diagnóstico', async () => {
    window.location.hash = '/assistant'
    render(<App />)
    act(() => useOrbitStore.getState().ask({ text: 'I feel dizzy' }))
    expect(await screen.findByText('When did it start?')).toBeTruthy()
    for (const a of ['Just now', 'Yes', 'No', 'No']) fireEvent.click(await screen.findByRole('button', { name: a }))
    expect((await screen.findAllByText(/You reported: I feel dizzy/)).length).toBeGreaterThan(0)
  })
})
