// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { useAppStore } from '@/state/store'
import { usePhaseStore } from '@/state/phase'

beforeEach(() => {
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT' })
  usePhaseStore.setState({ gravityChangeIso: null })
})
afterEach(cleanup)

const zone = (id: string) => document.querySelector(`[data-zone="${id}"]`) as SVGGElement

describe('Overview · L5 (P1)', () => {
  it('zona Legs com a adesão ao exercício', () => {
    render(<OverviewPage />)
    expect(zone('legs').getAttribute('data-status')).toBe('normal')
    fireEvent.click(zone('legs'))
    expect(screen.getByRole('article').textContent).toContain('Weekly exercise adherence')
  })

  it('trocar para um ambiente com outra gravidade → Heart "Adapting"; 3 dias depois volta (BODY-09)', () => {
    render(<OverviewPage />)
    act(() => useAppStore.getState().setEnvironment('LUNAR'))
    expect(zone('heart').getAttribute('data-status')).toBe('adapting')
    act(() => useAppStore.getState().advanceDay(3))
    expect(zone('heart').getAttribute('data-status')).toBe('attention')
  })

  it('Spacecraft → Space Station (mesma microgravidade) não dispara Adapting', () => {
    render(<OverviewPage />)
    act(() => useAppStore.getState().setEnvironment('ISS'))
    expect(zone('heart').getAttribute('data-status')).toBe('attention')
  })

  it('Advance day (demo) avança o dia e a dose de carreira (BODY-08)', () => {
    render(<OverviewPage />)
    fireEvent.click(screen.getByRole('button', { name: /Advance day/ }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Your body, day 121.')
  })

  it('Urgent pulsa; com o evento solar o overlay de radiação recebe a classe de pulso (BODY-05)', () => {
    render(<OverviewPage />)
    act(() => useAppStore.getState().replaySolarEvent())
    expect(zone('radiation').classList.contains('zone-pulse')).toBe(true)
    expect(document.querySelector('svg style')?.textContent).toContain('prefers-reduced-motion')
  })
})
