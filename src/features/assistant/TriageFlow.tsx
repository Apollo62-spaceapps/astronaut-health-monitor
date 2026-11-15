// Triagem guiada (L7 §6): uma pergunta por vez, com chips e texto livre na primeira. Sem diagnóstico.
// Ao terminar, o Orbit responde com o relato em palavras da pessoa, as ações seguras e, se for o caso, o
// escalonamento (o relato vai anexado ao pacote do CMO).
import { useState, type FormEvent } from 'react'
import { answerTriage, TRIAGE_QUESTIONS, triageReply, type TriageState } from '@/ai/triage'
import { TRIAGE_DISCLAIMER } from '@/ai/identity'
import { Button } from '@/components/ui/button'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'

export function TriageFlow({ messageId, state }: { messageId: string; state: TriageState }) {
  const ctx = useOrbitContext()
  const update = useOrbitStore((s) => s.update)
  const push = useOrbitStore((s) => s.push)
  const [text, setText] = useState('')

  if (state.step === 'done' || state.step === 'emergency') return null
  const q = TRIAGE_QUESTIONS[state.step]

  const answer = (value: string) => {
    if (!value.trim()) return
    const next = answerTriage(state, value)
    update(messageId, { triage: next })
    push({ role: 'user', text: value, at: ctx.simNowIso })
    if (next.step === 'done' || next.step === 'emergency')
      push({ role: 'orbit', reply: triageReply(next, ctx), at: ctx.simNowIso })
    setText('')
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    answer(text)
  }

  return (
    <section aria-label="Symptom check" className="w-full min-w-0 space-y-3 rounded-lg bg-surface-2 p-4 max-md:p-3">
      <p className="text-xs text-muted">{TRIAGE_DISCLAIMER}</p>
      <p className="text-[17px]">{q.question}</p>
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => (
          <Button key={o} size="sm" variant="outline" onClick={() => answer(o)} className="max-md:h-10">
            {o}
          </Button>
        ))}
      </div>
      {state.step === 'what' && (
        <form onSubmit={onSubmit} className="flex gap-2">
          <label htmlFor={`triage-${messageId}`} className="sr-only">
            Describe it in your words
          </label>
          <input
            id={`triage-${messageId}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe it in your words…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm max-md:h-11 max-md:text-base"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={!text.trim()}
            className="max-md:h-11 max-md:px-4"
          >
            Next
          </Button>
        </form>
      )}
    </section>
  )
}
