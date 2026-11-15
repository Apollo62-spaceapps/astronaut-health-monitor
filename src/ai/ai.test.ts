import { describe, expect, it } from 'vitest'
import { buildAssistantContext, deviationPct, levelFor } from '@/ai/contextTemp'
import { FORBIDDEN, canUseOnboardModel, replyWithFallback } from '@/ai/engine'
import { GENERIC_CHECK, protocolReply, suggestions } from '@/ai/protocol'
import { contextMessage, SYSTEM_PROMPT } from '@/ai/prompts'
import { DEMO_SPACE_WEATHER_EVENT, demoScenario } from '@/data/scenario'
import type { AssistantContext } from '@/domain/types'

const scen = demoScenario()
const ctxFor = (environment: AssistantContext['missionMode'], eventReplayed = false) =>
  buildAssistantContext({
    environment,
    alerts: [],
    vitals: scen.vitals,
    preflight: scen.preflight,
    eventReplayed,
    spaceWeatherEvent: DEMO_SPACE_WEATHER_EVENT,
  })

describe('contexto do assistente (montado por regras, AI-07)', () => {
  it('FC do dia 120 sai +18% → attention (placeholders P-01)', () => {
    const d = deviationPct('heartRate', scen.vitals, scen.preflight)
    expect(Math.round(d)).toBe(18)
    expect(levelFor('heartRate', d)).toBe('attention')
    expect(ctxFor('SPACECRAFT').vitalsSummary.find((v) => v.kind === 'heartRate')?.status).toBe('attention')
  })

  it('o evento solar só entra no contexto depois do replay', () => {
    expect(ctxFor('SPACECRAFT').activeEvent).toBeUndefined()
    expect(ctxFor('SPACECRAFT', true).activeEvent?.sepID).toBe(DEMO_SPACE_WEATHER_EVENT.sepID)
  })
})

describe('ProtocolEngine (AI-01)', () => {
  it('explica o desvio e as ações seguras, com o tempo de resposta do ambiente', () => {
    const r = protocolReply(ctxFor('SPACECRAFT'), 'What should I do now?')
    expect(r).toContain('18% above your own baseline')
    expect(r).toContain('Re-measure')
    expect(r).toContain('about 40 minutes')
    expect(protocolReply(ctxFor('EARTH'), 'how long until the ground replies?')).toContain('available now')
  })

  it('no evento solar manda seguir o abrigo e faz a checagem genérica (AI-08)', () => {
    const r = protocolReply(ctxFor('SPACECRAFT', true), 'What do I do about the solar event?')
    expect(r).toContain('shelter')
    expect(r).toContain(GENERIC_CHECK)
    expect(suggestions(ctxFor('SPACECRAFT', true))[0]).toBe('What do I do about the solar event?')
  })

  it('nunca usa palavras proibidas em nenhuma resposta', () => {
    for (const env of ['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT'] as const) {
      for (const q of [...suggestions(ctxFor(env, true)), 'hello', 'am I fit?']) {
        expect(protocolReply(ctxFor(env, true), q)).not.toMatch(FORBIDDEN)
      }
    }
  })
})

describe('seleção do motor (AI-03)', () => {
  it('?ai=protocol ou sem WebGPU → protocolo', () => {
    expect(canUseOnboardModel('?ai=protocol', { gpu: {} } as unknown as Navigator)).toBe(false)
    expect(canUseOnboardModel('', {} as Navigator)).toBe(false)
    expect(canUseOnboardModel('', { gpu: {} } as unknown as Navigator)).toBe(true)
  })

  it('se o modelo de bordo não responde, o protocolo assume (sem perder a conversa)', async () => {
    const r = await replyWithFallback('onboard-model', ctxFor('SPACECRAFT'), [], 'How am I doing today?')
    expect(r.engine).toBe('protocol')
    expect(r.fellBack).toBe(true)
    expect(r.text.length).toBeGreaterThan(0)
  })

  it('o system prompt proíbe diagnóstico, prescrição e mudar alertas (AI-05)', () => {
    expect(SYSTEM_PROMPT).toMatch(/must NOT diagnose/)
    expect(SYSTEM_PROMPT).toMatch(/must NOT contradict, downgrade or change any alert/)
    expect(contextMessage(ctxFor('SPACECRAFT'))).toContain('Spacecraft')
  })
})
