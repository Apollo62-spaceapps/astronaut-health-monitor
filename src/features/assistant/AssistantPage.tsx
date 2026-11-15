// Assistente (K7 #48) — SPEC §6.6, AI-01..08. A IA só conversa e resume; nunca muda status/alertas.
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Bot, Cpu, ListChecks } from 'lucide-react'
import type { AiMode, ChatMessage } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { buildAssistantContext } from '@/ai/contextTemp'
import { canUseOnboardModel, engineFor, replyWithFallback } from '@/ai/engine'
import { AI_LABEL } from '@/ai/prompts'
import { suggestions } from '@/ai/protocol'

export function AssistantPage() {
  const aiMode = useAppStore((s) => s.aiMode)
  const setAiMode = useAppStore((s) => s.setAiMode)
  const environment = useAppStore((s) => s.environment)
  const alerts = useAppStore((s) => s.alerts)
  const vitals = useAppStore((s) => s.vitals)
  const preflight = useAppStore((s) => s.preflight)
  const eventReplayed = useAppStore((s) => s.eventReplayed)
  const spaceWeatherEvent = useAppStore((s) => s.spaceWeatherEvent)
  const simNowIso = useAppStore((s) => s.simNowIso)

  const ctx = useMemo(
    () => buildAssistantContext({ environment, alerts, vitals, preflight, eventReplayed, spaceWeatherEvent }),
    [environment, alerts, vitals, preflight, eventReplayed, spaceWeatherEvent],
  )

  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState<{ p: number; text: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const user: ChatMessage = { role: 'user', text: q, at: simNowIso }
    setHistory((h) => [...h, user])
    setInput('')
    setBusy(true)
    const r = await replyWithFallback(aiMode, ctx, history, q)
    if (r.fellBack) setNotice('The onboard model did not answer safely in time — protocol mode answered instead.')
    setHistory((h) => [...h, { role: 'assistant', text: r.text, engine: r.engine, at: simNowIso }])
    setBusy(false)
    queueMicrotask(() => listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' }))
  }

  const switchTo = async (mode: AiMode) => {
    setNotice(null)
    if (mode === 'protocol') return setAiMode('protocol')
    if (!canUseOnboardModel()) {
      setNotice('WebGPU is not available here (or ?ai=protocol is set) — staying in protocol mode.')
      return setAiMode('protocol')
    }
    try {
      setLoading({ p: 0, text: 'Loading onboard model…' })
      await engineFor('onboard-model').init((p, text) => setLoading({ p, text }))
      setAiMode('onboard-model')
    } catch {
      setNotice('The onboard model could not start — protocol mode is active. The alerts do not change.')
      setAiMode('protocol')
    } finally {
      setLoading(null)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(input)
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="assistant-title" className="rounded-lg bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Assistant</p>
            <h1 id="assistant-title" className="mt-1 flex items-center gap-2 text-3xl">
              <Bot aria-hidden className="size-7" /> Ask about your data
            </h1>
          </div>
          <div role="group" aria-label="AI engine" className="flex gap-2">
            <Button
              variant={aiMode === 'protocol' ? 'secondary' : 'outline'}
              aria-pressed={aiMode === 'protocol'}
              onClick={() => void switchTo('protocol')}
            >
              <ListChecks aria-hidden /> Protocol mode
            </Button>
            <Button
              variant={aiMode === 'onboard-model' ? 'secondary' : 'outline'}
              aria-pressed={aiMode === 'onboard-model'}
              onClick={() => void switchTo('onboard-model')}
              disabled={loading !== null}
            >
              <Cpu aria-hidden /> Onboard model
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          The assistant only asks about symptoms and summarizes your data. Colors, alerts and escalation come from the
          rule engine and never change here.
        </p>
        {loading && (
          <div className="mt-3 space-y-1">
            <Progress value={Math.round(loading.p * 100)} aria-label="Model download progress" />
            <p className="text-xs text-muted">{loading.text}</p>
          </div>
        )}
        {notice && (
          <p role="status" className="mt-3 text-sm text-attention">
            ▲ {notice}
          </p>
        )}
      </section>

      <section aria-label="Conversation" className="rounded-lg bg-surface p-6">
        {history.length === 0 && <p className="text-muted">Choose a question below or type your own.</p>}
        <ol ref={listRef} className="space-y-3">
          {history.map((m, i) => (
            <li
              key={i}
              className={cn('max-w-[80ch] rounded-md p-3', m.role === 'user' ? 'ml-auto bg-surface-2' : 'bg-black/30')}
            >
              <p>{m.text}</p>
              {m.role === 'assistant' && (
                <p className="mt-2 text-xs text-muted">
                  {AI_LABEL} · {m.engine === 'onboard-model' ? 'Onboard model' : 'Protocol mode'}
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
