// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { VitalsPage } from '@/features/vitals/VitalsPage'
import { chartPoints } from '@/features/vitals/VitalChart'
import { MISSION_START_ISO, useAppStore } from '@/state/store'
import type { VitalReading } from '@/domain/types'

beforeEach(() => {
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT' })
})
afterEach(cleanup)

const page = () =>
  render(
    <TooltipProvider>
      <VitalsPage />
    </TooltipProvider>,
  )

describe('Vitais (L4 #55)', () => {
  it('um card por indicador, com status, desvio, selo e baselines (CORE-02/03)', () => {
    page()
    for (const label of [
      'Resting heart rate',
      'Systolic blood pressure',
      'Diastolic blood pressure',
      'Blood glucose',
      'Body temperature',
    ])
      expect(screen.getByRole('region', { name: label })).toBeTruthy()
    const hr = screen.getByRole('region', { name: 'Resting heart rate' })
    expect(hr.textContent).toContain('84')
    expect(hr.textContent).toContain('Attention')
    expect(hr.textContent).toContain('+18% vs pre-flight')
    expect(hr.textContent).toContain('SIMULATED')
    expect(hr.textContent).toContain('Trend')
    expect(screen.getAllByText('Illustrative thresholds').length).toBeGreaterThan(0)
  })

  it('um gráfico por indicador, com as duas linhas de baseline (CORE-05)', () => {
    page()
    expect(screen.getAllByRole('figure')).toHaveLength(5)
    expect(document.body.textContent).toContain('Pre-flight baseline')
    expect(document.body.textContent).toContain('(exam L-14…L-1)')
    expect(document.body.textContent).toContain('In-flight baseline')
    expect(document.body.textContent).toContain('(last 14 d)')
    expect(document.body.textContent).toContain('7-day average')
  })

  it('uma medição nova muda o card na hora (regra recalcula)', () => {
    page()
    act(() =>
      useAppStore.getState().addReading({
        kind: 'heartRate',
        value: 72,
        unit: 'bpm',
        takenAt: useAppStore.getState().simNowIso,
        provenance: { kind: 'simulated', note: 'Demo measurement' },
      }),
    )
    expect(screen.getByRole('region', { name: 'Resting heart rate' }).textContent).toContain('Normal')
  })

  it('pontos do gráfico: só até agora e no máximo 120 dias', () => {
    const r = (d: string): VitalReading => ({
      kind: 'glucose',
      value: 90,
      unit: 'mg/dL',
      takenAt: d,
      provenance: { kind: 'simulated' },
    })
    const pts = chartPoints(
      [r('2026-01-01T00:00:00Z'), r('2026-11-01T00:00:00Z'), r('2026-12-01T00:00:00Z')],
      MISSION_START_ISO,
      '2026-11-14T08:00:00Z',
    )
    expect(pts).toHaveLength(1)
  })
})
