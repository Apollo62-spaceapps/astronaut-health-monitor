// L7 §13: respostas do Orbit para cada intenção × ambiente × perfil. Regras inegociáveis (CLAUDE.md §0).
import { describe, expect, it } from 'vitest'
import { FORBIDDEN } from '@/ai/llm'
import { OUTLOOK_DISCLAIMER } from '@/ai/identity'
import { buildReply, etaText, suggestions } from '@/ai/reply'
import { INTENTS, type Intent, type StructuredReply } from '@/ai/schema'
import { testContext } from '@/ai/orbitTestUtils'
import { runEngine } from '@/domain/rules/engine'
import type { MissionMode, Role } from '@/domain/types'
import { testInput } from '@/ai/orbitTestUtils'

const ENVS: MissionMode[] = ['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT']
const ROLES: Role[] = ['ASTRONAUT', 'CMO', 'FLIGHT_SURGEON']
const ALLOWED_ACTIONS = new Set(['remeasure', 'notifyCmo', 'openChecklist', 'goto', 'startTriage', 'openReport'])
const textOf = (r: StructuredReply) =>
  [
    r.summary,
    r.why?.text,
    r.note,
    ...(r.limits ?? []),
    ...r.facts.flatMap((f) => [f.label, f.value, f.detail]),
    ...(r.lines ?? []).flatMap((l) => [l.label, l.detail]),
  ]
    .join(' ')
    // Aviso obrigatório (§5A) é uma negação, como o rodapé "not for diagnosis".
    .replaceAll(OUTLOOK_DISCLAIMER, '')

describe('reply.ts (Orbit) — todas as intenções, ambientes e perfis', () => {
  for (const environment of ENVS)
    for (const role of ROLES)
      for (const shelter of [false, true])
        it(`${environment} · ${role} · shelter ${shelter}`, () => {
          const ctx = testContext({ environment, role, shelter })
          for (const intent of INTENTS) {
            const r = buildReply(intent as Intent, ctx)
            const t = textOf(r)
            expect(t, `${intent}: palavra proibida`).not.toMatch(FORBIDDEN)
            for (const a of r.actions) expect(ALLOWED_ACTIONS.has(a.kind), `${intent}: ação ${a.kind}`).toBe(true)
            // CMO não registra medida (é do astronauta).
            if (role !== 'ASTRONAUT')
              expect(
                r.actions.some((a) => a.kind === 'remeasure'),
                intent,
              ).toBe(false)
            // Todo número em "Data" tem selo.
            for (const f of r.facts) if (/\d/.test(f.value)) expect(['REAL', 'SIMULATED']).toContain(f.provenance)
            // ETA do ambiente (R-ESC-01).
            if (r.escalate) expect(r.escalate.etaText).toBe(etaText(ctx))
            // CMO sem break-glass: nada de humor/sono.
            if (role === 'CMO') expect(t, intent).not.toMatch(/Mood \(self-report\)|\bof 5\b|Sleep\s+\d/)
            expect(r.engine).toBe('protocol')
          }
        })

  it('ETA: Earth "Flight surgeon available now"; Spacecraft "~40 min — safe actions now"', () => {
    expect(etaText(testContext({ environment: 'EARTH' }))).toBe('Flight surgeon available now')
    expect(etaText(testContext({ environment: 'SPACECRAFT' }))).toBe('Ground reply in ~40 min — safe actions now')
  })

  it('status: desvio vs baseline, sem "healthy", com escalonamento porque o motor tem attention', () => {
    const r = buildReply('status', testContext())
    expect(r.summary).toMatch(/Resting heart rate is 18% above your pre-flight baseline/)
    expect(r.escalate?.level).toBe('recommended')
    expect(r.illustrative).toBe(true)
  })

  it('zoneExplain heart: limiar ilustrativo, hazard e fonte; torso sem hazard ⇒ "under review" + consult', () => {
    const ctx = testContext()
    const heart = buildReply('zoneExplain', ctx, { zone: 'heart' })
    expect(heart.summary).toMatch(/Attention starts at 10% and Urgent at 25%/)
    expect(heart.why?.sourceIds).toContain('S19')
    const torso = buildReply('zoneExplain', ctx, { zone: 'torso' })
    expect(torso.why?.text).toMatch(/Related hazard: under review\. Consult your flight surgeon\./)
  })

  it('zoneExplain head para o CMO: Restricted, sem dado', () => {
    const r = buildReply('zoneExplain', testContext({ role: 'CMO' }), { zone: 'head' })
    expect(r.summary).toMatch(/Restricted/)
    expect(r.facts).toHaveLength(0)
  })

  it('solarEvent: evento DONKI REAL (S07), abrigo e checagem genérica', () => {
    const r = buildReply('solarEvent', testContext({ shelter: true }))
    expect(r.facts.filter((f) => f.provenance === 'REAL').every((f) => f.sourceId === 'S07')).toBe(true)
    expect(r.why?.text).toMatch(/Real event observed near Earth \(NASA DONKI\), replayed in this scenario\./)
    expect(r.summary).toMatch(/How are you feeling\? Any new symptoms\?/)
    expect(r.actions.map((a) => a.kind)).toEqual(['openChecklist', 'notifyCmo'])
  })

  it('ENV-04: sem taxa com fonte na Lua ⇒ "rate not sourced", sem número de dose da missão', () => {
    const r = buildReply('solarEvent', testContext({ environment: 'LUNAR' }))
    expect(textOf(r)).toMatch(/rate not sourced for this environment/)
  })

  it('groundDelay na Spacecraft fala de apagão (S10/S11)', () => {
    const r = buildReply('groundDelay', testContext({ environment: 'SPACECRAFT' }))
    expect(r.summary).toMatch(/blackouts/)
    expect(r.why?.sourceIds).toEqual(['S10', 'S11'])
  })

  it('privacy (CMO): não reconstrói o bem-estar', () => {
    const r = buildReply('privacy', testContext({ role: 'CMO' }))
    expect(r.lines?.find((l) => l.label.startsWith('Wellbeing details'))?.status).toBe('restricted')
  })

  it('riskOutlook: o astronauta vê só o nível dos colegas', () => {
    const ctx = testContext()
    const b = buildReply('riskOutlook', ctx, { crewId: 'B' })
    expect(b.facts).toHaveLength(0)
    expect(b.summary).toMatch(/Only the level is shared with you/)
    const mine = buildReply('riskOutlook', ctx, { text: 'What is driving my outlook?' })
    expect(mine.facts.length).toBeGreaterThan(0)
    expect(mine.why?.text).toMatch(/Mapping reviewed by: pending/)
  })

  it('reference e drift: origem da referência, "no sourced shift" e tendência preventiva', () => {
    const ctx = testContext()
    expect(buildReply('reference', ctx).limits?.join(' ')).toMatch(/No sourced shift for this environment/)
    const d = buildReply('drift', ctx)
    expect(d.summary).toMatch(/Resting heart rate has been drifting up for \d+ days/)
    expect(d.facts.every((f) => f.status === 'attention')).toBe(true)
  })

  it('sugestões: no máximo 5, e o evento solar aparece quando ativo', () => {
    expect(suggestions(testContext()).length).toBeLessThanOrEqual(5)
    expect(suggestions(testContext({ shelter: true }))[0]).toBe('What do I do about the solar event?')
  })

  it('AI-07: responder não muda alertas, zonas nem fila (mesma entrada ⇒ mesma saída)', () => {
    const input = testInput({ shelter: true })
    const before = JSON.stringify(runEngine(input))
    const ctx = testContext({ shelter: true })
    const a = INTENTS.map((i) => buildReply(i as Intent, ctx))
    const b = INTENTS.map((i) => buildReply(i as Intent, ctx))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(runEngine(input))).toBe(before)
    expect(ctx.outbox).toHaveLength(0)
  })
})
