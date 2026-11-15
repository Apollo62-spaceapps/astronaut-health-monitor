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

  it('na Spacecraft mostra o tempo de resposta como texto estático (sem cronômetro parado)', () => {
    render(<MissionBanner />)
    const w = screen.getByLabelText('Ground reply window, Spacecraft')
    expect(w.textContent).toContain('Ground reply ≈ 40 min (2 × 20 min delay)')
    expect(w.textContent).not.toMatch(/HRS|MINS|SECS/)
    expect(screen.queryByRole('timer')).toBeNull()
  })

  it('a contagem regressiva só aparece com um pacote enviado esperando resposta (ESC-04)', () => {
    render(<MissionBanner />)
    const p = useAppStore.getState().enqueuePacket('Daily summary')
    act(() => useAppStore.getState().setPacketStatus(p.id, 'sent'))
    expect(screen.getByRole('timer').textContent).toContain('40:00')
  })

  it('CMO e Flight Surgeon não recebem o lembrete de medir (é do astronauta)', () => {
    useAppStore.getState().advanceDay(1) // dia novo: as medições voltam a vencer
    render(<MissionBanner />)
    expect(screen.getByRole('button', { name: 'Log measurement' })).toBeTruthy()
    act(() => useAppStore.getState().setRole('CMO'))
    expect(screen.queryByRole('button', { name: 'Log measurement' })).toBeNull()
  })

  it('na Earth o flight surgeon está disponível na hora; mostra dia da missão e modo de IA', () => {
    render(<MissionBanner />)
    act(() => useAppStore.getState().setEnvironment('EARTH'))
    expect(screen.getByText('Flight surgeon available now')).toBeTruthy()
    expect(screen.getByLabelText('AI mode').textContent).toBe('AI: protocol mode')
  })
})
