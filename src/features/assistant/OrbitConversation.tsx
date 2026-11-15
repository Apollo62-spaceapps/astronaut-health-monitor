// Conversa do Orbit (L7 §7), usada na página e na gaveta: mensagens, estado vazio, "thinking", chips de
// sugestão (no máximo 5, conforme o contexto) e o campo. A lista anuncia só a resposta nova (aria-live).
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ASSISTANT_INTRO, THINKING_TEXT } from '@/ai/identity'
import { suggestions } from '@/ai/reply'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { OrbitMark } from '@/features/assistant/OrbitMark'
import { ReplyCard } from '@/features/assistant/ReplyCard'
import { TriageFlow } from '@/features/assistant/TriageFlow'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'

export function OrbitConversation({ compact = false, inputId }: { compact?: boolean; inputId: string }) {
  const ctx = useOrbitContext()
  const messages = useOrbitStore((s) => s.messages)
  const busy = useOrbitStore((s) => s.busy)
  const ask = useOrbitStore((s) => s.ask)
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLOListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chips = suggestions(ctx)
  const lastOrbit = [...messages].reverse().find((m) => m.role === 'orbit' && m.reply)
  const lastReplyId = lastOrbit?.id
  // Só as respostas que chegam com a conversa aberta são escritas aos poucos; as antigas aparecem prontas.
  const [mountedWith] = useState(messages.length)

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView?.({ block: 'nearest' })
  }, [messages.length, busy])

  const send = (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    ask({ text: q })
    setInput('')
    inputRef.current?.focus()
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Anuncia só a resposta nova, não a conversa inteira. */}
      <p className="sr-only" aria-live="polite">
        {busy ? THINKING_TEXT : (lastOrbit?.reply?.summary ?? '')}
      </p>

      {messages.length === 0 && (
        <div className={cn('flex items-start gap-4 rounded-lg bg-surface-2 p-4', compact && 'gap-3')}>
          <OrbitMark size={compact ? 'md' : 'lg'} decorative />
          <div className="space-y-1">
            <p className="text-[17px] leading-snug">{ASSISTANT_INTRO}</p>
            <p className="text-sm text-muted">Pick a question below or type your own.</p>
          </div>
        </div>
      )}

      <ol
        ref={listRef}
        aria-label="Conversation with Orbit"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
      >
        {messages
          // Triagem concluída: o cartão de resposta já resume tudo, a linha vazia some.
          .filter((m) => !(m.triage && !m.reply && (m.triage.step === 'done' || m.triage.step === 'emergency')))
          .map((m) => (
            <li key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'items-start gap-2')}>
              {m.role === 'user' ? (
                <p className="max-w-[80%] rounded-lg bg-surface-2 px-3 py-2 break-words">{m.text}</p>
              ) : (
                <>
                  {/* No celular, o avatar sai ao lado da resposta: o cartão ganha a largura toda. */}
                  <OrbitMark size="sm" decorative className="mt-1 max-md:hidden" />
                  {m.reply && (
                    <ReplyCard
                      reply={m.reply}
                      role={ctx.role}
                      shelterActive={ctx.shelterActive}
                      // Na gaveta, nenhuma primária: a tela atrás já tem a sua (um primário por tela).
                      latest={!compact && m.id === lastReplyId}
                      at={m.at}
                      stream={messages.indexOf(m) >= mountedWith}
                    />
                  )}
                  {m.triage && <TriageFlow messageId={m.id} state={m.triage} />}
                </>
              )}
            </li>
          ))}
        {busy && (
          <li className="flex items-center gap-2 text-sm text-muted">
            <OrbitMark size="sm" state="thinking" decorative />
            {THINKING_TEXT}
          </li>
        )}
      </ol>

      {/* Celular: chips com alvo de 40 px; sem conversa, quebram em linhas (cabem todas); depois, fileira rolável. */}
      <div
        className={cn('-mx-1 flex gap-2 overflow-x-auto px-1 pb-1', messages.length === 0 && 'max-md:flex-wrap')}
        aria-label="Suggested questions"
      >
        {chips.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={busy}
            className="shrink-0 cursor-pointer rounded-full border border-border px-3 py-1 text-sm whitespace-nowrap hover:bg-surface-2 disabled:opacity-50 max-md:min-h-10 max-md:py-2"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Message Orbit
        </label>
        <input
          ref={inputRef}
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Orbit…"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-base max-md:h-11"
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" disabled={busy || !input.trim()} className="max-md:h-11 max-md:px-5">
          Send
        </Button>
      </form>
    </div>
  )
}
