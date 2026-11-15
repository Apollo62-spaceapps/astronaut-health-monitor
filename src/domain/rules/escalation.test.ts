import { describe, expect, it } from 'vitest'
import { buildPacket, escalate, groundReplyText } from '@/domain/rules/escalation'
import type { Alert } from '@/domain/types'

const alert = (level: Alert['level']): Alert => ({
  id: level,
  ruleId: 'R-VIT-02',
  level,
  title: `t-${level}`,
  message: '',
  safeActions: [],
  escalateTo: [],
  createdAt: 't',
})

describe('R-ESC-01 · nível + ambiente', () => {
  it('normal → ninguém, sem fila', () => {
    expect(escalate('normal', 'SPACECRAFT')).toMatchObject({ escalateTo: [], enqueue: false })
  })

  it('attention → CMO + pacote normal; urgent → pacote prioritário (ESC-02)', () => {
    expect(escalate('attention', 'SPACECRAFT')).toMatchObject({
      escalateTo: ['CMO', 'FLIGHT_SURGEON'],
      enqueue: true,
      priority: 'normal',
    })
    expect(escalate('urgent', 'SPACECRAFT')).toMatchObject({ enqueue: true, priority: 'priority' })
  })

  it('ETA = 2 × atraso: Spacecraft 2400 s, Earth 0 (ESC-03)', () => {
    expect(escalate('attention', 'SPACECRAFT').etaGroundReplySec).toBe(2400)
    expect(escalate('attention', 'EARTH').etaGroundReplySec).toBe(0)
  })

  it('Earth: flight surgeon direto, sem fila', () => {
    expect(escalate('urgent', 'EARTH')).toMatchObject({
      escalateTo: ['FLIGHT_SURGEON'],
      enqueue: false,
      priority: 'priority',
      replyText: 'Flight surgeon available now.',
    })
  })

  it('texto do tempo de resposta', () => {
    expect(groundReplyText(2400)).toBe('Ground reply in ~40 min. Follow these safe actions now.')
    expect(groundReplyText(2.6)).toBe('Ground reply in ~2.6 s.')
  })
})

describe('pacote store-and-forward', () => {
  it('leva o ambiente, o ETA e a prioridade do pior alerta (ENV-05)', () => {
    const p = buildPacket([alert('attention'), alert('urgent')], 'SPACECRAFT', 'now', 'pkt-1')
    expect(p).toMatchObject({
      id: 'pkt-1',
      environment: 'SPACECRAFT',
      etaGroundReplySec: 2400,
      priority: 'priority',
      status: 'queued',
    })
    expect(p.summary).toContain('[urgent] t-urgent')
  })

  it('sem alertas → resumo diário', () => {
    expect(buildPacket([], 'ISS', 'now', 'p', 'Space Station').summary).toBe(
      'Daily summary — Space Station, no active alerts.',
    )
  })
})
