// Orbit (L7) — substitui o assistente "Ask about your data" (K7 #48). SPEC §6.6, AI-01..08.
// O Orbit lê o contexto montado pelas regras e propõe ações; nunca muda status, alertas ou escalonamento.
import { useState } from 'react'
import { Cpu, Lock, ShieldCheck, WifiOff } from 'lucide-react'
import { ASSISTANT_NAME, ASSISTANT_TAGLINE } from '@/ai/identity'
import { canUseOnboardModel, currentOnboardModelId, onboardEngine } from '@/ai/engine'
import { ONBOARD_MODEL_ID, ONBOARD_MODELS } from '@/ai/onboard'
import { RISK_TEXT } from '@/ai/reply'
import { KNOWLEDGE } from '@/ai/knowledge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { useAppStore } from '@/state/store'
import { formatShortDuration, formatUtcTime } from '@/lib/format'
import { useOnline } from '@/lib/useOnline'
import { OrbitConversation } from '@/features/assistant/OrbitConversation'
import { OrbitMark } from '@/features/assistant/OrbitMark'
import { RiskBadge } from '@/features/assistant/ReplyCard'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'
import { BODY_ZONES } from '@/domain/config/bodyZones'

/** Resumo curto do que está no contexto do perfil atual (útil e sem vazio grande). */
function WhatOrbitSees() {
  const ctx = useOrbitContext()
  const self = ctx.crew.find((c) => c.isSelf)
  const due = ctx.routine.filter((r) => r.status === 'due' || r.status === 'overdue').length
  return (
    <section aria-labelledby="orbit-sees" className="space-y-3 rounded-lg bg-surface p-4">
      <h2 id="orbit-sees" className="text-base">
        What {ASSISTANT_NAME} can see
      </h2>
      <ul className="space-y-1.5 text-sm">
        {BODY_ZONES.map((z) => {
          const st = ctx.body[z.id]
          return (
            <li key={z.id} className="flex items-center justify-between gap-2">
              <span>{z.label}</span>
              {st ? <StatusBadge status={st} /> : <span className="text-muted">No data</span>}
            </li>
          )
        })}
        <li className="flex items-center justify-between gap-2">
          <span>Active alerts</span>
          <span className="num">{ctx.alerts.length}</span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span>Routine due</span>
          <span className="num">{due}</span>
        </li>
        {self && (
          <li className="flex items-center justify-between gap-2">
            <span>Crew outlook (Crew A)</span>
            <RiskBadge level={self.level} />
          </li>
        )}
        <li className="flex items-center justify-between gap-2">
          <span>Ground reply</span>
          <span className="num">{ctx.groundReplySec === 0 ? 'now' : formatShortDuration(ctx.groundReplySec)}</span>
        </li>
      </ul>
      {ctx.access.wellbeingDetail !== 'full' && (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Lock aria-hidden className="mt-0.5 size-3 shrink-0" /> Mood and sleep are private for this profile.
        </p>
      )}
      <p className="text-xs text-muted">
        Status, alerts and escalation come from the rule engine; {ASSISTANT_NAME} only reads them. Outlook levels:{' '}
        {Object.values(RISK_TEXT).join(' / ')}.
      </p>
    </section>
  )
}

/** Fila store-and-forward: o que já foi confirmado pela pessoa. */
function Outbox() {
  const outbox = useAppStore((s) => s.outbox)
  return (
    <section aria-labelledby="orbit-outbox" className="space-y-2 rounded-lg bg-surface p-4">
      <h2 id="orbit-outbox" className="text-base">
        Messages to the ground
      </h2>
      {outbox.length === 0 ? (
        <p className="text-sm text-muted">Nothing queued. Drafts from {ASSISTANT_NAME} go here after you confirm.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {[...outbox].reverse().map((p) => (
            <li key={p.id} className="space-y-0.5 rounded-md bg-surface-2 p-2">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium capitalize">{p.status.replace('-', ' ')}</span>
                <span className="num text-xs text-muted">
                  {formatUtcTime(p.createdAt)} · reply{' '}
                  {p.etaGroundReplySec === 0 ? 'now' : `~${formatShortDuration(p.etaGroundReplySec)}`}
                  {p.priority === 'priority' ? ' · priority' : ''}
                </span>
              </p>
              <p className="line-clamp-2 text-xs text-muted">{p.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Modelo de bordo opcional (WebLLM). O protocolo cobre tudo; o modelo só reescreve o tom do resumo. */
function EnginePanel() {
  const aiMode = useAppStore((s) => s.aiMode)
  const setAiMode = useAppStore((s) => s.setAiMode)
  const [progress, setProgress] = useState<{ p: number; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // L8: três modelos com ID conferido na biblioteca. O padrão é o Llama 3.2 1B, o que o ensaio deixa em cache
  // (P-03; sem rede, outro modelo falharia no pitch). Se um motor já foi carregado, a tela mostra esse.
  const [modelId, setModelId] = useState<string>(() => currentOnboardModelId() ?? ONBOARD_MODEL_ID)
  const available = canUseOnboardModel()
  const loadedId = aiMode === 'onboard-model' ? (currentOnboardModelId() ?? modelId) : modelId
  const model = ONBOARD_MODELS.find((m) => m.id === loadedId) ?? ONBOARD_MODELS[0]

  const load = async () => {
    setError(null)
    setProgress({ p: 0, text: 'Starting…' })
    try {
      await onboardEngine(modelId).init((p, text) => setProgress({ p, text }))
      setAiMode('onboard-model')
    } catch {
      setError('The onboard model could not start here. Protocol mode covers everything.')
      setAiMode('protocol')
    } finally {
      setProgress(null)
    }
  }

  return (
    <section aria-labelledby="orbit-engine" className="space-y-2 rounded-lg bg-surface p-4 text-sm">
      <h2 id="orbit-engine" className="flex items-center gap-2 text-base">
        <Cpu aria-hidden className="size-4" /> Engine
      </h2>
      <p className="text-muted">
        {aiMode === 'onboard-model'
          ? `Onboard model (${model.label}) rewrites only the wording of each answer, grounded on the same facts and NASA passages. Facts, actions and escalation stay rule-based.`
          : `Protocol mode: every answer is built from the rules and a local library of ${KNOWLEDGE.length} passages, cited when they come from a source. Works offline, no download.`}
      </p>
      {progress && (
        <div className="space-y-1">
          <p>Downloading onboard model — one time, then works offline</p>
          <div
            className="h-2 w-full overflow-hidden rounded-sm bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.p * 100)}
          >
            <div className="h-full bg-foreground" style={{ width: `${Math.round(progress.p * 100)}%` }} />
          </div>
          <p className="truncate text-xs text-muted">{progress.text}</p>
        </div>
      )}
      {error && <p className="text-xs text-muted">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {aiMode === 'protocol' && available && !progress && (
          <>
            <label className="flex items-center gap-2 text-xs text-muted">
              <span className="sr-only">Onboard model</span>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-foreground"
              >
                {ONBOARD_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · ~{(m.vramMB / 1024).toFixed(1)} GB
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Load onboard model
            </Button>
          </>
        )}
        {(aiMode === 'onboard-model' || progress) && (
          <Button size="sm" variant="outline" onClick={() => setAiMode('protocol')}>
            Use protocol mode instead
          </Button>
        )}
      </div>
      {!available && <p className="text-xs text-muted">The onboard model needs WebGPU; protocol mode is in use.</p>}
    </section>
  )
}

export function AssistantPage() {
  const aiMode = useAppStore((s) => s.aiMode)
  const busy = useOrbitStore((s) => s.busy)
  const online = useOnline()
  const ctx = useOrbitContext()
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-4">
        <OrbitMark
          size="md"
          state={busy ? 'thinking' : ctx.worstLevel !== 'normal' || ctx.shelterActive ? 'attention' : 'idle'}
          decorative
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl">{ASSISTANT_NAME}</h1>
          <p className="text-muted">{ASSISTANT_TAGLINE}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-label="Orbit status">
          <li className="inline-flex items-center gap-1.5">
            <Cpu aria-hidden className="size-3.5" /> {aiMode === 'onboard-model' ? 'Onboard model' : 'Protocol mode'}
          </li>
          <li className="inline-flex items-center gap-1.5">
            {online ? <ShieldCheck aria-hidden className="size-3.5" /> : <WifiOff aria-hidden className="size-3.5" />}
            {online ? 'Offline ready' : 'Offline · running locally'}
          </li>
          <li>
            <IllustrativeThresholds />
          </li>
        </ul>
      </header>

      {/* grid-cols-[minmax(0,1fr)]: sem isso, a coluna implícita cresce até a largura das sugestões e vaza no celular. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-label="Conversation" className="flex min-h-[32rem] flex-col rounded-lg bg-surface p-4">
          <OrbitConversation inputId="orbit-page-input" />
        </section>
        <div className="flex flex-col gap-4">
          <WhatOrbitSees />
          <Outbox />
          <EnginePanel />
        </div>
      </div>
    </div>
  )
}
