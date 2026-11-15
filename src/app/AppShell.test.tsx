// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '@/app/App'
import { DISCLAIMER } from '@/app/AppShell'
import { TABS } from '@/app/tabs'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('AppShell (K1)', () => {
  it('mostra o rodapé obrigatório (NFR-08)', () => {
    render(<App />)
    expect(screen.getByText(DISCLAIMER)).toBeTruthy()
  })

  it('tem uma aba para cada seção', () => {
    render(<App />)
    for (const t of TABS) expect(screen.getByRole('link', { name: t.label })).toBeTruthy()
  })

  it('abre a aba do hash da URL', () => {
    window.location.hash = '/radiation'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Radiation' })).toBeTruthy()
  })

  it('nunca usa palavras proibidas na casca', () => {
    const { container } = render(<App />)
    expect(container.textContent?.toLowerCase()).not.toMatch(/\b(fit|unfit|healthy|diagnosis is)\b/)
  })
})
