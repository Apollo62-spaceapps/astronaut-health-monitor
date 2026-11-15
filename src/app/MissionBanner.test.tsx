// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MissionBanner, splitHms } from '@/app/MissionBanner'
import { useAppStore } from '@/state/store'

beforeEach(() => {
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})
afterEach(cleanup)

describe('MissionBanner (K4)', () => {
  it('splitHms divide 2400 s em 00:40:00', () => {
    expect(splitHms(2400)).toEqual({ h: 0, m: 40, s: 0 })
  })

  it('na Spacecraft mostra a janela de resposta de ~40 min', () => {
    render(<MissionBanner />)
    const w = screen.getByLabelText('Ground reply window, Spacecraft')
    expect(w.textContent?.replace(/\s+/g, ' ')).toContain('00 HRS 40 MINS 00 SECS')
  })

  it('na Earth o flight surgeon está disponível na hora; mostra dia da missão e modo de IA', () => {
    render(<MissionBanner />)
    act(() => useAppStore.getState().setEnvironment('EARTH'))
    expect(screen.getByText('Flight surgeon available now')).toBeTruthy()
    expect(screen.getByLabelText('AI mode').textContent).toBe('AI: protocol mode')
    expect(screen.getByRole('region', { name: 'Mission banner' }).textContent).toContain('120')
  })
})
