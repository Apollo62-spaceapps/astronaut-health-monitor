// Cartão de resposta do Orbit (L7b). Lê como um assistente, não como formulário: primeiro o texto corrido (escrito
// aos poucos; instantâneo com reduced-motion), com as fontes citadas no próprio texto; depois os passos guiados, as
// ações (uma só primária, no cartão mais recente da página), o que foi consultado na base local e as próximas
// perguntas. Os números com selo REAL/SIMULATED ficam em "Data and details". Status sempre cor + ícone + texto.
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { ArrowUpRight, BookOpen, ClipboardList, FileText, Lock, Radio, Ruler, Send, Stethoscope } from 'lucide-react'
import type { ReplyAction, StructuredReply } from '@/ai/schema'
import { AI_LABEL } from '@/ai/prompts'
import { RULE_BASED_LABEL } from '@/ai/identity'
import { RISK_TEXT } from '@/ai/reply'
import type { RiskLevel } from '@/domain/rules/risk'
import type { Role, SourceId } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { SourceRef } from '@/components/SourceRef'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { formatUtcTime, VITAL_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/features/environment/backdrops/useBackdropRuntime'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { goToTab } from '@/lib/useHashTab'

/** Nível do Crew outlook: tokens de status existentes, sempre cor + ícone + texto (DS §1). */
export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const meta = {
    low: { glyph: '✓', cls: 'text-normal' },
    guarded: { glyph: '▲', cls: 'text-attention' },
    elevated: { glyph: '▲', cls: 'text-attention hatch rounded-sm px-1 font-semibold' },
    high: { glyph: '●', cls: 'text-urgent hatch rounded-sm px-1' },
  }[level]
  return (
    <span data-risk={level} className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.cls, className)}>
      <span aria-hidden>{meta.glyph}</span>
      <span>{RISK_TEXT[level]}</span>
    </span>
  )
}

/** Texto com citações inline: "[S19]" e "[S10, S11]" viram links para Data & Sources. */
export function CitedText({ text }: { text: string }) {
  const parts = text.split(/(\[S\d+(?:, S\d+)*\])/g)
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[(S\d+(?:, S\d+)*)\]$/.exec(p)
        return m ? (
          <SourceRef key={i} ids={m[1]!.split(', ') as SourceId[]} className="text-xs" />
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      })}
    </>
  )
}

/** Respostas já escritas: reabrir a gaveta não reescreve o que já apareceu. */
const written = new Set<string>()

/** Escreve o texto aos poucos (~40 palavras/s), como um modelo gerando. Instantâneo quando `enabled` é false. */
function useStream(key: string, paragraphs: string[], enabled: boolean) {
  const total = paragraphs.reduce((n, p) => n + p.split(' ').length, 0)
  const [shown, setShown] = useState(() => (enabled && !written.has(key) ? 0 : total))
  useEffect(() => {
    if (shown >= total) {
      written.add(key)
      return
    }
    const t = window.setTimeout(() => setShown((n) => Math.min(total, n + 2)), 45)
    return () => window.clearTimeout(t)
  }, [shown, total, key])
  // Palavra inicial de cada parágrafo; mostra só o que já foi "escrito".
  const starts = paragraphs.map((_, i) => paragraphs.slice(0, i).reduce((n, p) => n + p.split(' ').length, 0))
  const visible = paragraphs.map((p, i) =>
    p
      .split(' ')
      .slice(0, Math.max(0, shown - starts[i]!))
      .join(' '),
  )
  return { visible: visible.filter(Boolean), done: shown >= total }
}

export function actionLabel(a: ReplyAction, role: Role, shelterActive = false): string {
  switch (a.kind) {
    case 'remeasure':
      return `Re-measure ${VITAL_LABEL[a.vital].toLowerCase()}`
    case 'notifyCmo':
      return role === 'ASTRONAUT' ? 'Notify CMO' : 'Send handoff'
    case 'openChecklist':
      // No abrigo, a ação leva ao procedimento de abrigo (RAD-04, S05).
      return shelterActive ? 'View shelter procedure' : 'Follow the onboard medical checklist'
    case 'goto':
      return a.label
    case 'startTriage':
      return 'Start a symptom check'
    case 'openReport':
      return 'Open the ground report'
  }
}

const ACTION_ICON = {
  remeasure: Ruler,
  notifyCmo: Send,
  openChecklist: ClipboardList,
  goto: ArrowUpRight,
  startTriage: Stethoscope,
  openReport: FileText,
}

function Label({ children }: { children: ReactNode }) {
  return <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">{children}</h3>
}

export function ReplyCard({
  reply,
  role,
  shelterActive,
  latest,
  at,
  stream = false,
}: {
  reply: StructuredReply
  role: Role
  shelterActive: boolean
  /** Só o cartão mais recente da página tem a ação primária (um primário por tela). Na gaveta, false. */
  latest: boolean
  at: string
  /** Escrever o texto aos poucos (só a resposta nova; nunca com reduced-motion). */
  stream?: boolean
}) {
  const setMeasure = useOrbitStore((s) => s.setMeasure)
  const setPacket = useOrbitStore((s) => s.setPacket)
  const setReportOpen = useOrbitStore((s) => s.setReportOpen)
  const ask = useOrbitStore((s) => s.ask)
  const reduced = useReducedMotion()
  const [checklistNote, setChecklistNote] = useState(false)
  const prose = reply.prose?.length ? reply.prose : [reply.summary]
  const { visible, done } = useStream(reply.id + at, prose, stream && !reduced)
  const primaryIdx = latest
    ? reply.actions.findIndex(
        (a) =>
          a.kind === 'remeasure' ||
          a.kind === 'notifyCmo' ||
          a.kind === 'openReport' ||
          (a.kind === 'openChecklist' && shelterActive),
      )
    : -1

  const run = (a: ReplyAction) => {
    switch (a.kind) {
      case 'remeasure':
        return setMeasure(a.vital)
      case 'notifyCmo':
        return setPacket({ report: reply.report })
      case 'openChecklist':
        if (shelterActive) goToTab('radiation')
        else setChecklistNote(true)
        return
      case 'goto':
        return goToTab(a.tab)
      case 'startTriage':
        return ask({ text: '', intent: 'triage' })
      case 'openReport':
        return setReportOpen(true)
    }
  }

  const hasDetails = reply.facts.length > 0 || (reply.lines?.length ?? 0) > 0 || (reply.limits?.length ?? 0) > 0

  return (
    <article
      aria-label={`Orbit: ${prose[0]}`}
      data-intent={reply.intent}
      className="w-full space-y-4 rounded-lg bg-surface-2 p-4"
    >
      <div className="space-y-3 text-[16px] leading-relaxed" aria-busy={!done}>
        {visible.map((p, i) => (
          <p key={i}>
            <CitedText text={p} />
            {!done && i === visible.length - 1 && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-foreground/70"
              />
            )}
          </p>
        ))}
      </div>

      {done && (
        <>
          {reply.steps && reply.steps.length > 0 && (
            <section className="space-y-2">
              <Label>Step by step</Label>
              <ol className="space-y-2">
                {reply.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-snug">
                    <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">
                      {s.text}
                      {s.sourceIds?.length ? <SourceRef ids={s.sourceIds} className="ml-1 text-xs" /> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {reply.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {reply.actions.map((a, i) => {
                const Icon = ACTION_ICON[a.kind]
                return (
                  <Button
                    key={`${a.kind}-${i}`}
                    size="sm"
                    variant={i === primaryIdx ? 'default' : 'outline'}
                    onClick={() => run(a)}
                  >
                    <Icon aria-hidden />
                    {actionLabel(a, role, shelterActive)}
                  </Button>
                )
              })}
            </div>
          )}
          {checklistNote && (
            <p className="text-xs text-muted">
              Use the onboard medical checklist that flies with the crew; it is not part of this prototype.
            </p>
          )}

          {reply.escalate && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Radio aria-hidden className="size-4 shrink-0 text-muted" />
              <span className="font-medium">
                {reply.escalate.level === 'recommended' ? 'Notify the CMO' : 'Consider notifying the CMO'}
              </span>
              <span className="text-muted">· {reply.escalate.etaText}</span>
            </p>
          )}

          {reply.consulted && reply.consulted.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <BookOpen aria-hidden className="size-3.5" /> Consulted onboard:
              </span>
              {reply.consulted.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-sm bg-surface px-1.5 py-0.5">
                  {c.title}
                  {c.sourceIds.length > 0 && <SourceRef ids={c.sourceIds} className="text-xs" />}
                </span>
              ))}
            </div>
          )}

          {hasDetails && (
            <details className="rounded-md bg-surface px-3 py-2 text-sm">
              <summary className="cursor-pointer text-xs font-semibold tracking-wider text-muted uppercase select-none">
                Data and details
              </summary>
              <div className="mt-2 space-y-3">
                {reply.facts.length > 0 && (
                  <ul className="divide-y divide-border/60">
                    {reply.facts.map((f, i) => (
                      <li
                        key={`${f.label}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5"
                      >
                        <span>{f.label}</span>
                        <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                          <span>
                            <span className="num font-semibold">{f.value}</span>
                            {f.unit && <span className="num ml-1 text-xs text-muted">{f.unit}</span>}
                          </span>
                          {f.status && <StatusBadge status={f.status} />}
                          {f.detail && <span className="num text-xs text-muted">{f.detail}</span>}
                          <span
                            className={cn(
                              'text-[11px] font-medium tracking-wider uppercase',
                              f.provenance === 'REAL' ? 'text-link' : 'text-muted',
                            )}
                          >
                            {f.provenance}
                          </span>
                          {f.sourceId && <SourceRef ids={[f.sourceId]} className="text-xs" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {reply.lines && reply.lines.length > 0 && (
                  <ul className="space-y-1">
                    {reply.lines.map((l, i) => (
                      <li key={`${l.label}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="flex items-center gap-1.5">
                          {l.status === 'restricted' && <Lock aria-hidden className="size-3.5 text-muted" />}
                          {l.label}
                        </span>
                        <span className="flex items-center gap-2">
                          {l.status && <StatusBadge status={l.status} />}
                          {l.risk && <RiskBadge level={l.risk} />}
                          {l.neutral && <span className="text-muted">{l.neutral}</span>}
                          {l.detail && <span className="num text-xs text-muted">{l.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {reply.escalate && <p className="text-xs text-muted">Escalation reason: {reply.escalate.reason}</p>}
                {reply.limits && reply.limits.length > 0 && (
                  <ul className="space-y-0.5 text-xs text-muted">
                    {reply.limits.map((l) => (
                      <li key={l} className="flex items-start gap-1.5">
                        <Lock aria-hidden className="mt-0.5 size-3 shrink-0" /> {l}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          )}

          {reply.followUps && reply.followUps.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Follow-up questions">
              {reply.followUps.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask({ text: q })}
                  className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm hover:bg-surface"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs text-muted">
        <span>
          {reply.engine === 'onboard-model' ? `${AI_LABEL} · Onboard model` : RULE_BASED_LABEL}
          {reply.note ? ` · ${reply.note}` : ''}
        </span>
        <span className="flex items-center gap-3">
          {reply.illustrative && <IllustrativeThresholds />}
          <span className="num">{formatUtcTime(at)} · simulated</span>
        </span>
      </footer>
    </article>
  )
}
