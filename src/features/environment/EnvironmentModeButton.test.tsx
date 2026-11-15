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
    expect(screen.getByRole('radio', { name: 'Spacecraft' }).getAttribute('data-state')).toBe('on')
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

  it('clicar no modo já ativo não deixa a plataforma sem modo', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: 'Spacecraft' }))
    expect(useAppStore.getState().environment).toBe('SPACECRAFT')
  })

  it('não é tema escuro: o fundo continua o mesmo em todos os modos', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: 'Moon' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })
})
