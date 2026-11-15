// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '@/app/App'
import { useAppStore } from '@/state/store'

beforeEach(() => {
  localStorage.clear()
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})
afterEach(cleanup)

describe('Botão de modo de ambiente (K5, ENV-01..03)', () => {
  it('tem os 4 modos, com o atual marcado', () => {
    render(<App />)
    for (const label of ['Earth', 'Space Station', 'Moon', 'Spacecraft']) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy()
    }
    expect(screen.getByRole('radio', { name: 'Spacecraft' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Earth' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('radiogroup').getAttribute('aria-labelledby')).toBe('env-mode-label')
  })

  it('só o item selecionado entra no Tab (tabindex roving)', () => {
    render(<App />)
    const tabbable = screen.getAllByRole('radio').filter((r) => r.getAttribute('tabindex') === '0')
    expect(tabbable.map((r) => r.getAttribute('aria-label'))).toEqual(['Spacecraft'])
    for (const r of screen.getAllByRole('radio')) {
      if (r.getAttribute('aria-checked') === 'false') expect(r.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('setas ←/→ (e Home/End) trocam o modo e atualizam data-environment no <html>', () => {
    render(<App />)
    const spacecraft = screen.getByRole('radio', { name: 'Spacecraft' })
    fireEvent.keyDown(spacecraft, { key: 'ArrowRight' }) // último → volta ao primeiro
    expect(useAppStore.getState().environment).toBe('EARTH')
    expect(document.documentElement.dataset.environment).toBe('earth')
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Earth' }))

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Earth' }), { key: 'ArrowRight' })
    expect(document.documentElement.dataset.environment).toBe('station')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Space Station' }), { key: 'ArrowLeft' })
    expect(document.documentElement.dataset.environment).toBe('earth')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Earth' }), { key: 'End' })
    expect(document.documentElement.dataset.environment).toBe('spacecraft')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Spacecraft' }), { key: 'Home' })
    expect(document.documentElement.dataset.environment).toBe('earth')
    expect(screen.getByRole('radio', { name: 'Earth' }).getAttribute('tabindex')).toBe('0')
  })

  it('não usa o Toggle do shadcn (o hover cinza deixava o texto ilegível na faixa)', () => {
    render(<App />)
    for (const r of screen.getAllByRole('radio')) {
      expect(r.className).not.toMatch(/hover:text-muted|hover:bg-muted/)
      if (r.getAttribute('aria-checked') === 'true') expect(r.className).not.toContain('hover:')
    }
  })

  it('ao clicar, troca o modo da plataforma: store, faixa (data-environment) e janela de resposta', () => {
    render(<App />)
    expect(document.documentElement.dataset.environment).toBe('spacecraft')

    fireEvent.click(screen.getByRole('radio', { name: 'Earth' }))
    expect(useAppStore.getState().environment).toBe('EARTH')
    expect(document.documentElement.dataset.environment).toBe('earth')
    expect(screen.getByText('Flight surgeon available now')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: 'Space Station' }))
    expect(document.documentElement.dataset.environment).toBe('station')
  })

  it('clicar no modo já ativo mantém o modo e não chama setEnvironment', () => {
    render(<App />)
    let calls = 0
    const unsub = useAppStore.subscribe((s, prev) => {
      if (s.environment !== prev.environment) calls++
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Spacecraft' }))
    unsub()
    expect(useAppStore.getState().environment).toBe('SPACECRAFT')
    expect(screen.getByRole('radio', { name: 'Spacecraft' }).getAttribute('aria-checked')).toBe('true')
    expect(calls).toBe(0)
  })

  it('não é tema escuro: o fundo continua o mesmo em todos os modos', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: 'Moon' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })
})
