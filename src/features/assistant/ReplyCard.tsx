// Cartão de resposta do Orbit (L7 §7). Renderiza o StructuredReply: resumo, Data (números com selo REAL/SIMULATED
// e fonte), Why it matters (hazard + fonte), Safe actions (uma só primária, e só no cartão mais recente),
// Escalation (ícone + texto + ETA) e o rodapé com o modo do motor. Status sempre cor + ícone + texto.
import { useState } from 'react'
import { ArrowUpRight, ClipboardList, Lock, Radio, Ruler, Send, Stethoscope } from 'lucide-react'
import type { ReplyAction, StructuredReply } from '@/ai/schema'
import { AI_LABEL } from '@/ai/prompts'
import { RULE_BASED_LABEL } from '@/ai/identity'
import { RISK_TEXT } from '@/ai/reply'
import { HAZARD_LABEL } from '@/domain/config/bodyZones'
import type { RiskLevel } from '@/domain/rules/risk'
import type { Role } from '@/domain/types'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { SourceRef } from '@/components/SourceRef'
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { formatUtcTime, VITAL_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
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

function ProvenanceTag({ provenance, sourceId }: { provenance: 'REAL' | 'SIMULATED'; sourceId?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'text-[11px] font-medium tracking-wider uppercase',
          provenance === 'REAL' ? 'text-link' : 'text-muted',
        )}
      >
        {provenance}
      </span>
      {sourceId && <SourceRef ids={[sourceId as `S${number}`]} className="text-xs" />}
    </span>
  )
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
  }
}

const ACTION_ICON = {
  remeasure: Ruler,
  notifyCmo: Send,
  openChecklist: ClipboardList,
  goto: ArrowUpRight,
  startTriage: Stethoscope,
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}

export function ReplyCard({
  reply,
  role,
  shelterActive,
  latest,
  at,
}: {
  reply: StructuredReply
  role: Role
  shelterActive: boolean
  /** Só o cartão mais recente tem a ação primária (um primário por tela). Na gaveta, false. */
  latest: boolean
  at: string
}) {
  const setMeasure = useOrbitStore((s) => s.setMeasure)
  const setPacket = useOrbitStore((s) => s.setPacket)
  const ask = useOrbitStore((s) => s.ask)
  const [checklistNote, setChecklistNote] = useState(false)
  // Ação principal: medir de novo > avisar o CMO > abrir o abrigo. As outras ficam secundárias.
  const primaryIdx = latest
    ? reply.actions.findIndex(
        (a) => a.kind === 'remeasure' || a.kind === 'notifyCmo' || (a.kind === 'openChecklist' && shelterActive),
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
    }
  }

  return (
    <article
      aria-label={`Orbit: ${reply.summary}`}
      data-intent={reply.intent}
      className="w-full space-y-4 rounded-lg bg-surface-2 p-4"
    >
      <p className="text-[17px] leading-snug">{reply.summary}</p>

      {reply.lines && reply.lines.length > 0 && (
        <ul className="space-y-1 text-sm">
          {reply.lines.map((l, i) => (
            <li
              key={`${l.label}-${i}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border/60 pb-1 last:border-0"
            >
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

      {reply.facts.length > 0 && (
        <Block title="Data">
          <ul className="divide-y divide-border/60 rounded-md bg-surface px-3">
            {reply.facts.map((f, i) => (
              <li
                key={`${f.label}-${i}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
              >
                <span>{f.label}</span>
                <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                  <span>
                    <span className="num font-semibold">{f.value}</span>
                    {f.unit && <span className="num ml-1 text-xs text-muted">{f.unit}</span>}
                  </span>
                  {f.status && <StatusBadge status={f.status} />}
                  {f.detail && <span className="num text-xs text-muted">{f.detail}</span>}
                  <ProvenanceTag provenance={f.provenance} sourceId={f.sourceId} />
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {reply.why && (
        <Block title="Why it matters">
          <p className="text-sm">
            {reply.why.hazard && <span className="text-muted">{HAZARD_LABEL[reply.why.hazard]} · </span>}
            {reply.why.text}{' '}
            {reply.why.sourceIds.length > 0 && <SourceRef ids={reply.why.sourceIds} className="text-xs" />}
          </p>
        </Block>
      )}

      {reply.actions.length > 0 && (
        <Block title="Safe actions">
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
          {checklistNote && (
            <p className="text-xs text-muted">
              Use the onboard medical checklist that flies with the crew; it is not part of this prototype.
            </p>
          )}
        </Block>
      )}

      {reply.escalate && (
        <Block title="Escalation">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Radio aria-hidden className="size-4 shrink-0 text-muted" />
            <span className="font-medium">
              {reply.escalate.level === 'recommended' ? 'Notify the CMO' : 'Consider notifying the CMO'}
            </span>
            <span className="text-muted">· {reply.escalate.reason}</span>
            <span className="font-medium">· {reply.escalate.etaText}</span>
          </p>
        </Block>
      )}

      {reply.limits && reply.limits.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted">
          {reply.limits.map((l) => (
            <li key={l} className="flex items-start gap-1.5">
              <Lock aria-hidden className="mt-0.5 size-3 shrink-0" /> {l}
            </li>
          ))}
        </ul>
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
