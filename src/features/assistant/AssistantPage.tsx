// Assistente (K7 #48) — SPEC §6.6, AI-01..08. A IA só conversa e resume; nunca muda status/alertas.
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Bot } from 'lucide-react'
import type { ChatMessage } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildAssistantContext } from '@/domain/rules/engine'
import { useEngineInput } from '@/state/useEngine'
import { replyWithFallback } from '@/ai/engine'
import { suggestions } from '@/ai/protocol'

export function AssistantPage() {
  const simNowIso = useAppStore((s) => s.simNowIso)

  // Contexto montado pelo motor de regras, com a privacidade do perfil (AI-07, ENV-05, §6.7).
  const engineInput = useEngineInput()
  const ctx = useMemo(() => buildAssistantContext(engineInput), [engineInput])

  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const user: ChatMessage = { role: 'user', text: q, at: simNowIso }
    setHistory((h) => [...h, user])
    setInput('')
    setBusy(true)
    const r = await replyWithFallback('protocol', ctx, history, q)
    setHistory((h) => [...h, { role: 'assistant', text: r.text, engine: r.engine, at: simNowIso }])
    setBusy(false)
    queueMicrotask(() => listRef.current?.lastElementChild?.scrollIntoView?.({ block: 'nearest' }))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(input)
  }

  return (
    <div className="flex min-h-[calc(100vh-15rem)] flex-col gap-4">
      <section aria-labelledby="assistant-title" className="rounded-lg bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Assistant</p>
            <h1 id="assistant-title" className="mt-1 flex items-center gap-2 text-3xl">
              <Bot aria-hidden className="size-7" /> Ask about your data
            </h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          The assistant only asks about symptoms and summarizes your data. Colors, alerts and escalation come from the
          rule engine and never change here.
        </p>
      </section>

      <section aria-label="Conversation" className="flex min-h-80 flex-1 flex-col rounded-lg bg-surface p-6">
        {history.length === 0 && <p className="text-muted">Choose a question below or type your own.</p>}
        <ol ref={listRef} className="flex-1 space-y-3 overflow-y-auto">
          {history.map((m, i) => (
            <li
              key={i}
              className={cn('max-w-[80ch] rounded-md p-3', m.role === 'user' ? 'ml-auto bg-surface-2' : 'bg-black/30')}
            >
              <p>{m.text}</p>
              {m.role === 'assistant' && (
                <p className="mt-2 text-xs text-muted">
                  {/* Protocol mode é determinístico: não é "AI-generated" (AI-06 vale só para o WebLLM). */}
                  Rule-based response · Protocol mode
                </p>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions(ctx).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void ask(q)}
              disabled={busy}
              className="rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-2"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Message
          </label>
          <input
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2"
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" disabled={busy || !input.trim()}>
            Send
          </Button>
        </form>
      </section>
    </div>
  )
}
