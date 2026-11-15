// @vitest-environment jsdom
// K9 #51 — apagão de comunicação (ESC-05).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CommsPage, replyText } from '@/features/escalation/CommsPage'
import { blackoutPossible, isBlackoutActive } from '@/features/escalation/blackout'
import { useAppStore } from '@/state/store'

beforeEach(() => {
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('regra do apagão (ESC-05)', () => {
  it('só a Spacecraft tem apagão com fonte [S10, S11]', () => {
    expect(blackoutPossible('SPACECRAFT')).toBe(true)
    for (const env of ['EARTH', 'ISS', 'LUNAR'] as const) expect(blackoutPossible(env)).toBe(false)
  })

  it('vale só com o interruptor ligado e na Spacecraft', () => {
    expect(isBlackoutActive('SPACECRAFT', true)).toBe(true)
    expect(isBlackoutActive('SPACECRAFT', false)).toBe(false)
    expect(isBlackoutActive('ISS', true)).toBe(false)
  })

  it('o texto da resposta do solo muda no apagão', () => {
    expect(replyText(2400, true)).toMatch(/^Comm blackout/)
  })
})

describe('CommsPage com apagão (K9)', () => {
  it('no apagão o pacote fica queued; ao terminar, a fila volta a andar', () => {
    vi.useFakeTimers()
    render(<CommsPage />)
    fireEvent.click(screen.getByRole('switch', { name: /comm blackout/i }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Comm blackout')

    fireEvent.click(screen.getByRole('button', { name: /send summary to ground/i }))
    act(() => vi.advanceTimersByTime(60_000))
    expect(useAppStore.getState().outbox[0]?.status).toBe('queued')
    expect(screen.getByText('Queued — held until the blackout ends')).toBeTruthy()

    fireEvent.click(screen.getByRole('switch', { name: /comm blackout/i }))
    act(() => vi.advanceTimersByTime(900))
    expect(useAppStore.getState().outbox[0]?.status).toBe('sent')
  })

  it('o interruptor não aparece fora da Spacecraft, e o apagão não vale lá', () => {
    useAppStore.setState({ environment: 'ISS', commBlackout: true })
    render(<CommsPage />)
    expect(screen.queryByRole('switch', { name: /comm blackout/i })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toContain('Comm blackout')
  })
})
