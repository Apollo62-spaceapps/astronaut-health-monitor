// @vitest-environment jsdom
// Faixa da missão (K4). Desde 15/11 (77133e7, 76fdfb4) ela tem só o seletor de ambiente e, quando há algo a
// dizer, o lembrete de medida ou o aviso de abrigo. O tempo de resposta do solo aparece na Overview e no Orbit.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MissionBanner, splitHms } from '@/app/MissionBanner'
import { useAppStore } from '@/state/store'
import { useOrbitStore } from '@/features/assistant/orbitStore'

beforeEach(() => {
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
  useOrbitStore.setState({ open: false, pending: null })
})
afterEach(cleanup)

describe('MissionBanner (K4)', () => {
  it('splitHms divide 2400 s em 00:40:00', () => {
    expect(splitHms(2400)).toEqual({ h: 0, m: 40, s: 0 })
  })

  it('sem cronômetro parado nem contagem na faixa', () => {
    render(<MissionBanner />)
    expect(screen.queryByRole('timer')).toBeNull()
    expect(screen.getByRole('region', { name: 'Mission banner' }).textContent).not.toMatch(/HRS|MINS|SECS/)
  })

  it('lembrete de medida (ROUT-03) com Log measurement e o atalho para o Orbit', () => {
    useAppStore.getState().advanceDay(1) // dia novo: as medições voltam a vencer
    render(<MissionBanner />)
    expect(screen.getByText(/Time to measure your/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Log measurement' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ask Orbit' }))
    expect(useOrbitStore.getState()).toMatchObject({ open: true, pending: { intent: 'routine' } })
  })

  it('CMO e Flight Surgeon não recebem o lembrete de medir (é do astronauta)', () => {
    useAppStore.getState().advanceDay(1)
    render(<MissionBanner />)
    expect(screen.getByRole('button', { name: 'Log measurement' })).toBeTruthy()
    act(() => useAppStore.getState().setRole('CMO'))
    expect(screen.queryByRole('button', { name: 'Log measurement' })).toBeNull()
  })

  it('abrigo ativo: aviso Urgent no lugar do lembrete (RAD-05)', () => {
    useAppStore.getState().advanceDay(1)
    render(<MissionBanner />)
    act(() => useAppStore.getState().replaySolarEvent())
    expect(screen.getByText(/Urgent · Radiation shelter active — routine items postponed/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Log measurement' })).toBeNull()
  })
})
