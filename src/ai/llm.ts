// Camada LLM do Orbit (L7 §8): o WebLLM só REESCREVE o `summary` em tom natural. Nunca decide conteúdo clínico.
// Recebe os fatos já montados e devolve JSON {"summary": "…"}. Toda saída é validada: Zod, palavras proibidas,
// ≤ 280 caracteres e todo número citado precisa existir no contexto. Falhou ⇒ fica o resumo determinístico,
// sem erro na tela (só o selo do modo). O semáforo e os alertas não mudam em nenhum caso.
import { llmOutputSchema, type StructuredReply } from '@/ai/schema'

/** Palavras que nenhuma resposta pode ter (BODY-07). */
export const FORBIDDEN =
  /\b(fit|unfit|healthy|diagnos\w*|prescri\w*|you'?re (fine|safe|ok|okay)|you are (fine|safe|ok|okay)|nothing to worry)\b/i

/** Para o LLM, mais restrito: nomes de doença comuns, medicamentos e dose. */
export const LLM_FORBIDDEN = new RegExp(
  [
    FORBIDDEN.source,
    String.raw`\b(infection|virus|flu|covid|fever|arrhythmia|tachycardia|bradycardia|hypertension|hypotension|diabetes|anemia|stroke|heart attack|concussion|cancer|depression|anxiety disorder|insomnia disorder)\b`,
    String.raw`\b(ibuprofen|aspirin|paracetamol|acetaminophen|antibiotic\w*|medication|medicine|pill\w*|tablet\w*|dose of|mg\b|milligram\w*)\b`,
  ].join('|'),
  'i',
)

export const LLM_SYSTEM_PROMPT = [
  'You rewrite one short summary for an onboard health copilot in a decision-support PROTOTYPE (not a medical device).',
  'Use ONLY the facts given. Do not add numbers, causes, conditions, medication or doses.',
  'Never say anyone is fit, unfit, healthy, fine or safe. Never contradict or soften an alert.',
  'At most 2 short sentences, calm, plain English, second person, no emoji, no exclamation marks.',
  'Answer with JSON only: {"summary": "..."}',
].join(' ')

/** Mensagens para o modelo: só fatos prontos. */
export function summaryMessages(reply: StructuredReply) {
  const facts = reply.facts.map(
    (f) => `- ${f.label}: ${f.value}${f.unit ? ` ${f.unit}` : ''}${f.detail ? ` (${f.detail})` : ''}`,
  )
  return [
    { role: 'system' as const, content: LLM_SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: [
        `Deterministic summary: ${reply.summary}`,
        facts.length ? `Facts:\n${facts.join('\n')}` : 'Facts: none',
        reply.escalate ? `Escalation: ${reply.escalate.etaText}` : '',
        'Rewrite the summary.',
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ]
}

const numbersIn = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.'))

/** Números que o resumo pode citar: os do resumo determinístico, dos fatos e do escalonamento. */
export function allowedNumbers(reply: StructuredReply): Set<string> {
  const text = [
    reply.summary,
    ...reply.facts.flatMap((f) => [f.value, f.unit ?? '', f.detail ?? '']),
    reply.escalate?.etaText ?? '',
    ...(reply.lines ?? []).flatMap((l) => [l.label, l.detail ?? '']),
  ].join(' ')
  return new Set(numbersIn(text))
}

export type SummaryCheck = { ok: true; summary: string } | { ok: false; reason: string }

/** Valida a saída do modelo. Qualquer falha ⇒ { ok: false } e fica o resumo determinístico. */
export function validateSummary(raw: string, reply: StructuredReply): SummaryCheck {
  const json = raw.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return { ok: false, reason: 'no JSON object' }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'invalid JSON' }
  }
  const r = llmOutputSchema.safeParse(parsed)
  if (!r.success) return { ok: false, reason: 'schema (missing summary or longer than 280 characters)' }
  const summary = r.data.summary.trim()
  if (LLM_FORBIDDEN.test(summary)) return { ok: false, reason: 'forbidden wording' }
  if (/!/.test(summary)) return { ok: false, reason: 'exclamation mark' }
  const allowed = allowedNumbers(reply)
  const invented = numbersIn(summary).filter((n) => !allowed.has(n))
  if (invented.length) return { ok: false, reason: `number not in context: ${invented.join(', ')}` }
  return { ok: true, summary }
}

export type Generate = (messages: ReturnType<typeof summaryMessages>) => Promise<string>

/** Pede ao modelo o resumo e valida. Erro, tempo ou saída inválida ⇒ resposta determinística intacta. */
export async function rewriteSummary(reply: StructuredReply, generate: Generate): Promise<StructuredReply> {
  try {
    const raw = await generate(summaryMessages(reply))
    const check = validateSummary(raw, reply)
    if (check.ok) return { ...reply, summary: check.summary, engine: 'onboard-model' }
    if (import.meta.env.DEV) console.info(`[Orbit] LLM summary discarded: ${check.reason}`)
  } catch (e) {
    if (import.meta.env.DEV) console.info('[Orbit] LLM unavailable:', e)
  }
  return reply
}
