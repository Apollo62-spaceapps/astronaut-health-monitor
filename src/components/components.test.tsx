// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StatusBadge, STATUS_META } from '@/components/StatusBadge'
import { ProvenanceBadge, provenanceLabel } from '@/components/ProvenanceBadge'
import { MetricCard } from '@/components/MetricCard'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import type { ZoneStatus } from '@/domain/types'

afterEach(cleanup)

describe('StatusBadge (CORE-03)', () => {
  it('cada status tem ícone e palavra próprios (nunca só cor)', () => {
    const glyphs = new Set(Object.values(STATUS_META).map((m) => m.glyph))
    const labels = new Set(Object.values(STATUS_META).map((m) => m.label))
    expect(glyphs.size).toBe(5)
    expect([...labels]).toEqual(['Normal', 'Attention', 'Urgent', 'Restricted', 'Adapting'])
  })

  it('mostra texto e detalhe; Urgent leva hachura', () => {
    for (const s of Object.keys(STATUS_META) as ZoneStatus[]) {
      const { container } = render(<StatusBadge status={s} detail="+18%" />)
      expect(container.textContent).toContain(STATUS_META[s].label)
      expect(container.textContent).toContain('+18%')
      cleanup()
    }
    const { container } = render(<StatusBadge status="urgent" />)
    expect(container.firstElementChild?.className).toContain('hatch')
  })

  it('nunca usa o vermelho da marca (action) para status', () => {
    for (const m of Object.values(STATUS_META)) expect(m.className).not.toMatch(/action/)
  })
})

describe('ProvenanceBadge (NFR-05)', () => {
  it('REAL mostra a fonte; simulado mostra SIMULATED', () => {
    expect(provenanceLabel({ kind: 'real', sourceId: 'S07' })).toBe('REAL · DONKI')
    expect(provenanceLabel({ kind: 'simulated' })).toBe('SIMULATED')
    render(<ProvenanceBadge provenance={{ kind: 'simulated' }} />)
    expect(screen.getByRole('link', { name: /^SIMULATED/ }).getAttribute('href')).toBe('#/sources?src=simulated')
  })
})

describe('MetricCard', () => {
  it('renderiza rótulo, número, status e selo', () => {
    render(
      <MetricCard
        label="Heart rate · rest"
        value="84"
        unit="bpm"
        status="attention"
        statusDetail="+18%"
        provenance={{ kind: 'simulated' }}
      />,
    )
    const card = screen.getByRole('region', { name: 'Heart rate · rest' })
    expect(card.textContent).toContain('84')
    expect(card.textContent).toContain('Attention')
    expect(card.textContent).toContain('SIMULATED')
  })

  it('selo de limiares ilustrativos', () => {
    render(<IllustrativeThresholds />)
    expect(screen.getByText('Illustrative thresholds')).toBeTruthy()
  })
})
