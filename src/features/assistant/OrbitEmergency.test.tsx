// @vitest-environment jsdom
// Emergência proativa: vital Urgent (regra R-VIT-02) → aviso em tela cheia com ações não clínicas e "Notify CMO now".
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OrbitEmergency } from '@/features/assistant/OrbitEmergency'
import { useAppStore } from '@/state/store'
import type { Alert } from '@/domain/types'

const alert = (over: Partial<Alert>): Alert => ({
  id: 'R-VIT-02:heartRate:x',
  ruleId: 'R-VIT-02',
  level: 'urgent',
  title: 'Resting heart rate +32% vs your pre-flight baseline',
  message: '',
  safeActions: ['Re-measure', 'Notify CMO', 'Follow the onboard medical checklist'],
  escalateTo: [],
  createdAt: '2026-11-15T12:00:00Z',
  ...over,
})

describe('OrbitEmergency', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useAppStore.getState().resetScenario()
  })

  it('vital Urgent: abre "This needs a person now", ações não clínicas e atraso; Notify CMO enfileira prioridade', () => {
    useAppStore.setState({ alerts: [alert({})], environment: 'SPACECRAFT', outbox: [] })
    render(<OrbitEmergency />)
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(screen.getByText('This needs a person now')).toBeTruthy()
    expect(screen.getByText('Follow the onboard medical checklist.')).toBeTruthy()
    expect(screen.getByText(/the CMO onboard is your first contact/)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\b(fit|healthy|medication|dose of)\b/i)

    fireEvent.click(screen.getByRole('button', { name: 'Notify CMO now' }))
    const outbox = useAppStore.getState().outbox
    expect(outbox).toHaveLength(1)
    expect(outbox[0]!.priority).toBe('priority')
    expect(screen.getByText(/priority message queued/)).toBeTruthy()
  })

  it('não abre para aviso de projeção (attention) nem para o abrigo solar (tem fluxo próprio)', () => {
    useAppStore.setState({
      alerts: [
        alert({ id: 'p', ruleId: 'R-PROJ-01', level: 'attention' }),
        alert({ id: 's', ruleId: 'R-RAD-03', level: 'urgent' }),
      ],
    })
    render(<OrbitEmergency />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
