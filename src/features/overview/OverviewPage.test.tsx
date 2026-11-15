// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { useAppStore } from '@/state/store'

beforeEach(() => {
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})
afterEach(cleanup)

const zone = (id: string) => document.querySelector(`[data-zone="${id}"]`) as SVGGElement

describe('Overview (L3 #54)', () => {
  it('título do dia, frase das regras e um único botão primário', () => {
    render(<OverviewPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Your body, day 120.')
    expect(document.body.textContent).toContain('Resting heart rate is 18% above your own baseline')
    expect(document.body.textContent).toContain('about 40 minutes')
    expect(screen.getAllByText('Illustrative thresholds', { exact: false }).length).toBeGreaterThan(0)
  })

  it('mapa: Heart em attention com aria-label descritivo (BODY-02, BODY-04)', () => {
    render(<OverviewPage />)
    const heart = zone('heart')
    expect(heart.getAttribute('data-status')).toBe('attention')
    expect(heart.getAttribute('aria-label')).toBe('Heart — Attention — resting heart rate +18% vs baseline')
    expect(heart.getAttribute('tabindex')).toBe('0')
  })

  it('teclado: Enter abre o card da zona na ordem do BODY-03', () => {
    render(<OverviewPage />)
    fireEvent.keyDown(zone('torso'), { key: 'Enter' })
    const card = screen.getByRole('article')
    expect(card.querySelector('h2')?.textContent).toBe('Torso')
    const titles = [...card.querySelectorAll('h3')].map((h) => h.textContent)
    expect(titles).toEqual([
      'Function',
      'Indicator',
      'Related hazard',
      'How to measure',
      'Why it matters',
      'What to do',
      'Source',
    ])
    expect(card.textContent).toContain('Related hazard: under review') // P-13
    expect(card.textContent).toContain('Consult your flight surgeon.')
  })

  it('CMO: Head cinza com "Restricted" (BODY-06); com consentimento volta a ter nível', () => {
    render(<OverviewPage />)
    act(() => useAppStore.getState().setRole('CMO'))
    expect(zone('head').getAttribute('data-status')).toBe('restricted')
    expect(zone('head').getAttribute('aria-label')).toContain('Restricted')
    act(() => useAppStore.getState().setConsent(true))
    expect(zone('head').getAttribute('data-status')).toBe('normal')
  })

  it('replay do evento solar → alerta urgent no topo e abrigo no card da radiação', () => {
    render(<OverviewPage />)
    act(() => useAppStore.getState().replaySolarEvent())
    expect(zone('radiation').getAttribute('data-status')).toBe('urgent')
    fireEvent.click(zone('radiation'))
    expect(screen.getByRole('article').textContent).toContain('Adapted from NASA Orion radiation shelter procedure.')
    expect(document.body.textContent).toContain('Solar particle event: follow the shelter procedure now.')
  })

  it('ambiente sem taxa de dose não mostra número (ENV-04)', () => {
    render(<OverviewPage />)
    act(() => useAppStore.getState().setEnvironment('ISS'))
    expect(document.body.textContent).toContain('rate not sourced for this environment')
  })

  it('nunca usa palavras proibidas (BODY-07)', () => {
    render(<OverviewPage />)
    expect(document.body.textContent).not.toMatch(/\b(fit|healthy|diagnos)/i)
  })
})
