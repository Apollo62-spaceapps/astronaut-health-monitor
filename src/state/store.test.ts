// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_MISSION_DAY, missionDayToIso, useAppStore } from '@/state/store'

beforeEach(() => {
  localStorage.clear()
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'SPACECRAFT', role: 'ASTRONAUT', aiMode: 'protocol' })
})

describe('store (K2)', () => {
  it('começa no dia 120 da missão, com relógio simulado', () => {
    const s = useAppStore.getState()
    expect(s.missionDay).toBe(DEMO_MISSION_DAY)
    expect(s.simNowIso).toBe(missionDayToIso(DEMO_MISSION_DAY))
  })

  it('break-glass exige motivo e gera auditoria (PRIV-03)', () => {
    const s = useAppStore.getState()
    s.setRole('CMO')
    expect(() => useAppStore.getState().breakGlassAccess('   ')).toThrow()
    useAppStore.getState().breakGlassAccess('Crewmate unresponsive')
    const after = useAppStore.getState()
    expect(after.breakGlass.active).toBe(true)
    expect(after.auditLog.at(-1)).toMatchObject({
      actor: 'CMO',
      action: 'BREAK_GLASS_VIEW',
      reason: 'Crewmate unresponsive',
    })
  })

  it('mudar o consentimento gera auditoria (MH-04)', () => {
    useAppStore.getState().setConsent(true)
    const s = useAppStore.getState()
    expect(s.consent.shareWellbeingAlertsWithCmo).toBe(true)
    expect(s.auditLog.at(-1)?.action).toBe('CONSENT_CHANGED')
  })

  it('o pacote usa o ETA do ambiente atual (ESC-03, ENV-05)', () => {
    const p = useAppStore.getState().enqueuePacket('HR +18% vs baseline', 'priority')
    expect(p).toMatchObject({ etaGroundReplySec: 2400, environment: 'SPACECRAFT', status: 'queued' })
    useAppStore.getState().setEnvironment('EARTH')
    expect(useAppStore.getState().enqueuePacket('test').etaGroundReplySec).toBe(0)
  })

  it('replay do evento liga o abrigo; reset volta ao estado inicial', () => {
    useAppStore.getState().replaySolarEvent()
    expect(useAppStore.getState().shelterActive).toBe(true)
    useAppStore.getState().resetScenario()
    expect(useAppStore.getState().shelterActive).toBe(false)
    expect(useAppStore.getState().outbox).toEqual([])
  })

  it('só preferências persistem (ambiente, perfil, IA)', () => {
    useAppStore.getState().setEnvironment('LUNAR')
    const saved = JSON.parse(localStorage.getItem('apollo62:prefs') ?? '{}')
    expect(saved.state).toEqual({ environment: 'LUNAR', role: 'ASTRONAUT', aiMode: 'protocol' })
  })
})
