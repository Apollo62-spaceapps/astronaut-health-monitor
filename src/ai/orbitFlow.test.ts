// L7 §13: triagem, pacote e camada LLM do Orbit.
import { describe, expect, it } from 'vitest'
import { answerTriage, startTriage, triageReply } from '@/ai/triage'
import { draftPacket } from '@/ai/packet'
import { rewriteSummary, validateSummary } from '@/ai/llm'
import { buildReply } from '@/ai/reply'
import { orbitAnswer } from '@/ai/engine'
import { EMERGENCY_TEXT } from '@/ai/identity'
import { testContext, testInput } from '@/ai/orbitTestUtils'
import { runEngine } from '@/domain/rules/engine'

describe('triage.ts', () => {
  const quiet = testContext({ environment: 'EARTH', patch: (i) => ({ ...i, vitals: i.preflight }) })

  it('máquina de estados: what → when → worse → tasks → remeasured → done', () => {
    let s = startTriage()
    expect(s.step).toBe('what')
    for (const [answer, next] of [
      ['Head', 'when'],
      ['Earlier today', 'worse'],
      ['No', 'tasks'],
      ['No', 'remeasured'],
      ['Yes', 'done'],
    ] as const) {
      s = answerTriage(s, answer)
      expect(s.step).toBe(next)
    }
    const r = triageReply(s, quiet)
    expect(r.summary).toMatch(/^You reported: /)
    expect(r.escalate?.level).toBe('consider')
    expect(r.note).toBe("I can't tell you what this is. Here is what I can do.")
  })

  it('"getting worse" ou "stops tasks" ⇒ escalonamento recomendado com o relato anexado', () => {
    let s = startTriage('I feel dizzy')
    expect(s.step).toBe('when')
    for (const a of ['Just now', 'Yes', 'No', 'No']) s = answerTriage(s, a)
    const r = triageReply(s, quiet)
    expect(r.escalate?.level).toBe('recommended')
    expect(r.report).toMatch(/I feel dizzy/)
    expect(draftPacket(quiet, { report: r.report }).summary).toMatch(/Crew report \(own words\): "I feel dizzy/)
  })

  it('alerta do motor já ativo ⇒ recomendado mesmo sem piora', () => {
    let s = startTriage('my head hurts a bit')
    for (const a of ['Just now', 'No', 'No', 'Yes']) s = answerTriage(s, a)
    expect(triageReply(s, testContext()).escalate?.level).toBe('recommended')
  })

  it('dor no peito, falta de ar ou desmaio ⇒ resposta imediata, sem fluxo clínico', () => {
    for (const t of ['I have chest pain', "I can't breathe", 'I fainted']) {
      const s = startTriage(t)
      expect(s.step).toBe('emergency')
      const r = triageReply(s, quiet)
      expect(r.summary).toBe(EMERGENCY_TEXT)
      expect(r.actions.map((a) => a.kind)).toEqual(['notifyCmo', 'openChecklist'])
    }
    expect(answerTriage(startTriage(), 'chest pain').step).toBe('emergency')
  })
})

describe('packet.ts', () => {
  it('Spacecraft: CMO + flight surgeon, ETA 40 min; Earth: flight surgeon agora', () => {
    const sc = draftPacket(testContext())
    expect(sc.recipientsText).toBe('CMO and flight surgeon')
    expect(sc.etaText).toBe('Ground reply in ~40 min — safe actions now')
    expect(sc.summary).toMatch(/Drafted by Orbit, confirmed by you/)
    expect(draftPacket(testContext({ environment: 'EARTH' })).etaText).toBe('Flight surgeon available now')
  })
  it('perfil CMO vira handoff sem bem-estar; abrigo ⇒ prioridade', () => {
    const h = draftPacket(testContext({ role: 'CMO' }))
    expect(h.handoff).toBe(true)
    expect(h.summary).not.toMatch(/mood|sleep/i)
    expect(draftPacket(testContext({ shelter: true })).priority).toBe('priority')
  })
})

describe('llm.ts — o modelo só reescreve o resumo', () => {
  const reply = buildReply('status', testContext())
  it('aceita um resumo curto que só cita números do contexto', () => {
    expect(
      validateSummary(
        '{"summary":"Your resting heart rate is 18% above your baseline. Re-measure, then notify the CMO."}',
        reply,
      ),
    ).toMatchObject({ ok: true })
  })
  it.each([
    ['diagnóstico', '{"summary":"This looks like an infection."}'],
    ['"you are fine"', '{"summary":"You are fine, nothing to do."}'],
    ['número inventado', '{"summary":"Your heart rate is 97 bpm."}'],
    ['texto longo', JSON.stringify({ summary: 'a '.repeat(200) })],
    ['JSON inválido', '{"summary": "oops"'],
    ['sem JSON', 'Your heart rate is high.'],
    ['medicação', '{"summary":"Take ibuprofen and rest."}'],
  ])('rejeita %s ⇒ cai para o resumo determinístico', async (_n, raw) => {
    expect(validateSummary(raw, reply).ok).toBe(false)
    const r = await rewriteSummary(reply, async () => raw)
    expect(r.summary).toBe(reply.summary)
    expect(r.engine).toBe('protocol')
  })
  it('erro ou tempo limite do modelo ⇒ resposta determinística intacta', async () => {
    const r = await rewriteSummary(reply, async () => {
      throw new Error('timeout')
    })
    expect(r).toEqual(reply)
  })
  it('AI-07: com o LLM (mock), fatos, ações e escalonamento iguais; motor de regras igual', async () => {
    const input = testInput()
    const before = JSON.stringify(runEngine(input))
    const ctx = testContext()
    const q = { text: 'How am I doing today?' }
    const viaLlm = await orbitAnswer(
      ctx,
      q,
      'onboard-model',
      async () => '{"summary":"Resting heart rate is 18% above your baseline."}',
    )
    const viaProtocol = await orbitAnswer(ctx, q, 'protocol')
    expect(viaLlm.engine).toBe('onboard-model')
    // O modelo só troca o texto de abertura; fatos, ações, passos e escalonamento são os mesmos.
    expect({ ...viaLlm, summary: '', prose: [], engine: '' }).toEqual({
      ...viaProtocol,
      summary: '',
      prose: [],
      engine: '',
    })
    expect(viaLlm.prose?.slice(1)).toEqual(viaProtocol.prose?.slice(1))
    expect(JSON.stringify(runEngine(input))).toBe(before)
  })
})
