// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CommsPage, replyText } from '@/features/escalation/CommsPage'
import { escalate } from '@/features/escalation/escalateTemp'
import { useAppStore } from '@/state/store'

beforeEach(() => {
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('escalonamento temporário (ESC-02, até a L2)', () => {
  it('normal não escala; attention põe na fila; urgent é prioritário', () => {
    expect(escalate('normal', 'SPACECRAFT')).toMatchObject({ enqueue: false, escalateTo: [] })
    expect(escalate('attention', 'SPACECRAFT')).toMatchObject({
      enqueue: true,
      priority: 'normal',
      etaGroundReplySec: 2400,
    })
    expect(escalate('urgent', 'EARTH')).toMatchObject({ priority: 'priority', etaGroundReplySec: 0 })
  })
})

describe('CommsPage (K6)', () => {
  it('texto do tempo de resposta por ambiente (ESC-03)', () => {
    expect(replyText(2400)).toBe('Ground reply in ~40 min. Follow these safe actions now.')
    expect(replyText(0)).toBe('Flight surgeon available now.')
  })

  it('o mesmo cenário muda ao vivo entre Spacecraft e Earth', () => {
    render(<CommsPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('~40 min')
    act(() => useAppStore.getState().setEnvironment('EARTH'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('available now')
  })

  it('o pacote anda na fila: queued → sent → reply-received (tempo acelerado)', () => {
    vi.useFakeTimers()
    render(<CommsPage />)
    act(() => useAppStore.getState().setTimeAcceleration(600))
    fireEvent.click(screen.getByRole('button', { name: /send summary to ground/i }))
    expect(useAppStore.getState().outbox[0]?.status).toBe('queued')
    expect(screen.getByText('Time-accelerated for demo')).toBeTruthy()
    act(() => vi.advanceTimersByTime(900))
    expect(useAppStore.getState().outbox[0]?.status).toBe('sent')
    act(() => vi.advanceTimersByTime((2400 * 1000) / 600 + 100))
    expect(useAppStore.getState().outbox[0]?.status).toBe('reply-received')
  })
})
