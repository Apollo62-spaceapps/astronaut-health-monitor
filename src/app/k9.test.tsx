// @vitest-environment jsdom
// K9 #51 — selos clicáveis levam à fonte (SRC-02) e ⓘ de privacidade com fonte (PRIV-05).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '@/app/App'
import { ProvenanceBadge, provenanceHref } from '@/components/ProvenanceBadge'
import { readHashParam } from '@/lib/useHashTab'
import { useAppStore } from '@/state/store'

beforeEach(() => {
  localStorage.clear()
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})
afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('selos clicáveis (SRC-02)', () => {
  it('REAL abre a própria fonte; SIMULATED abre a base ou a nota de dados simulados', () => {
    expect(provenanceHref({ kind: 'real', sourceId: 'S07' })).toBe('#/sources?src=S07')
    expect(provenanceHref({ kind: 'simulated', basis: 'S09' })).toBe('#/sources?src=S09')
    expect(provenanceHref({ kind: 'simulated' })).toBe('#/sources?src=simulated')
  })

  it('o selo é um link com nome acessível', () => {
    render(<ProvenanceBadge provenance={{ kind: 'real', sourceId: 'S07' }} />)
    const link = screen.getByRole('link', { name: /REAL · DONKI — open source S07/ })
    expect(link.getAttribute('href')).toBe('#/sources?src=S07')
  })

  it('lê o parâmetro do hash', () => {
    expect(readHashParam('src', '#/sources?src=S05')).toBe('S05')
    expect(readHashParam('src', '#/sources')).toBeNull()
  })

  it('Data & Sources destaca a linha da fonte pedida', () => {
    window.location.hash = '/sources?src=S07'
    const { container } = render(<App />)
    expect(container.querySelector('#source-S07')?.getAttribute('aria-current')).toBe('true')
    expect(container.querySelector('#source-S03')?.getAttribute('aria-current')).toBeNull()
  })
})

describe('ⓘ de privacidade (PRIV-05)', () => {
  it('explica a privacidade com as fontes S02 e S04', () => {
    window.location.hash = '/wellbeing'
    render(<App />)
    const toggle = screen.getByRole('button', { name: /why is this private/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    const info = document.getElementById('privacy-info')
    expect(info?.textContent).toContain('Privacy Act of 1974')
    expect(info?.querySelector('a[href="#/sources?src=S02"]')).toBeTruthy()
    expect(info?.querySelector('a[href="#/sources?src=S04"]')).toBeTruthy()
  })
})
