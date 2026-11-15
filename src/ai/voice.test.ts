// L7b: voz do Orbit (texto corrido), base local (Edge RAG), seguimento e relatório para a Terra.
import { describe, expect, it } from 'vitest'
import { orbitProtocolAnswer } from '@/ai/engine'
import { OUTLOOK_DISCLAIMER } from '@/ai/identity'
import { KNOWLEDGE, retrieve } from '@/ai/knowledge'
import { FORBIDDEN } from '@/ai/llm'
import { narrate, ragAnswer } from '@/ai/narrate'
import { testContext } from '@/ai/orbitTestUtils'
import { buildReply } from '@/ai/reply'
import { buildGroundReport } from '@/ai/report'
import { INTENTS, type Intent } from '@/ai/schema'
import { SOURCES } from '@/data/sources'
import type { MissionMode } from '@/domain/types'

const IDS = new Set(SOURCES.map((s) => s.id))
const citedIds = (text: string) => [...text.matchAll(/\[(S\d+(?:, S\d+)*)\]/g)].flatMap((m) => m[1]!.split(', '))

describe('voz do Orbit (narrate.ts)', () => {
  for (const environment of ['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT'] as MissionMode[])
    for (const shelter of [false, true])
      it(`${environment} · shelter ${shelter}: texto corrido sem palavra proibida e com fontes do catálogo`, () => {
        const ctx = testContext({ environment, shelter })
        for (const intent of INTENTS) {
          const n = narrate(buildReply(intent as Intent, ctx), ctx, { text: 'How am I doing?' })
          const text = [...n.prose, ...(n.steps ?? []).map((s) => s.text)].join(' ').replaceAll(OUTLOOK_DISCLAIMER, '')
          expect(n.prose.length, intent).toBeGreaterThan(0)
          expect(text, intent).not.toMatch(FORBIDDEN)
          for (const id of citedIds(text)) expect(IDS.has(id as `S${number}`), `${intent}: ${id}`).toBe(true)
          for (const c of n.consulted ?? []) for (const id of c.sourceIds) expect(IDS.has(id), id).toBe(true)
        }
      })

  it('status conversa com os números da pessoa, a tendência e o tempo até a Terra', () => {
    const n = narrate(buildReply('status', testContext()), testContext(), { text: 'How am I doing today?' })
    const t = n.prose.join(' ')
    expect(t).toMatch(/84 bpm at 07:30, about 18% above your pre-flight average of 71 bpm/)
    expect(t).toMatch(/moving up for \d+ days in a row/)
    expect(t).toMatch(/about 40 minutes/)
  })

  it('whatNow dá passos guiados com a fonte do checklist', () => {
    const r = orbitProtocolAnswer(testContext(), { text: 'What should I do now?' })
    expect(r.steps?.[0]?.text).toMatch(/^Re-measure your resting heart rate now/)
    expect(r.steps?.some((s) => s.sourceIds?.includes('S04'))).toBe(true)
  })

  it('mesma pergunta ⇒ mesmo texto (determinístico)', () => {
    const ctx = testContext()
    expect(orbitProtocolAnswer(ctx, { text: 'How am I doing today?' })).toEqual(
      orbitProtocolAnswer(ctx, { text: 'How am I doing today?' }),
    )
  })
})

describe('Edge RAG (knowledge.ts)', () => {
  it('toda passagem tem fontes do catálogo (ou é cálculo físico) e nenhuma palavra proibida', () => {
    for (const p of KNOWLEDGE) {
      for (const id of p.sourceIds) expect(IDS.has(id), `${p.id}: ${id}`).toBe(true)
      expect(p.text, p.id).not.toMatch(FORBIDDEN)
    }
  })
  it.each([
    ['How do astronauts exercise on the station?', 'iss-exercise'],
    ['What is the career radiation limit?', 'radiation-limit'],
    ['Why does my blood pressure change after landing?', 'heart-gravity'],
    ['How long is the delay to Mars?', 'mars-delay'],
    ['What are the hazards of spaceflight?', 'hrp-hazards'],
  ])('"%s" recupera %s', (q, id) => {
    expect(retrieve(q).map((h) => h.passage.id)).toContain(id)
  })
  it('pergunta livre responde da base, citando; sem fonte, não adivinha', () => {
    const ctx = testContext()
    const yes = ragAnswer('How do astronauts exercise on the station?', ctx)
    expect(yes.prose.join(' ')).toMatch(/ARED.*\[S13\]/)
    const no = ragAnswer('What is the best pizza topping?', ctx)
    expect(no.prose[0]).toMatch(/I don’t have a source onboard for that, so I won’t guess/)
  })
  it('seguimento ("why?") aprofunda o assunto anterior com a base local', () => {
    const ctx = testContext()
    const first = orbitProtocolAnswer(ctx, {
      text: 'Why is my heart zone attention?',
      intent: 'zoneExplain',
      zone: 'heart',
    })
    const why = orbitProtocolAnswer(ctx, { text: 'why?', previous: first })
    expect(why.id).toMatch(/^followUp:/)
    expect(why.prose?.join(' ')).toMatch(/orthostatic intolerance\. \[S19\]|orthostatic intolerance\.\s*\[S19\]/)
    expect(why.actions).toHaveLength(0)
  })
})

describe('relatório para a Terra (report.ts)', () => {
  it('poucos kB, com alertas, vitais, fontes e selos', () => {
    const r = buildGroundReport(testContext({ shelter: true }), {
      includeWellbeing: true,
      crewReports: ['I feel dizzy'],
    })
    expect(r.bytes).toBeLessThan(12_000)
    expect(r.markdown).toMatch(/## Vitals against the personal reference/)
    expect(r.markdown).toMatch(/Resting heart rate \| 84 bpm/)
    expect(r.markdown).toMatch(/REAL, NASA DONKI/)
    expect(r.markdown).toMatch(/Crew report \(own words\): "I feel dizzy"/)
    expect(r.sourceIds).toContain('S03')
    for (const id of r.sourceIds) expect(r.markdown).toContain(`[${id}]`)
    expect(r.markdown.replace('not a medical device', '')).not.toMatch(FORBIDDEN)
    expect(r.packetSummary).toMatch(/Drafted by Orbit, confirmed by you/)
  })
  it('bem-estar fica de fora se o astronauta não incluir', () => {
    const r = buildGroundReport(testContext(), { includeWellbeing: false })
    expect(r.markdown).toMatch(/Not included by the astronaut/)
    expect(r.markdown).not.toMatch(/mood 1–5/)
  })
})
