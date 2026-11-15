// Runtime do Orbit (L7), carregado sob demanda pelo OrbitHost na 1ª vez que alguém usa o Orbit (o chunk inicial
// não cresce): responde às perguntas pendentes com o contexto atual, mostra a gaveta e os diálogos das ações
// propostas (medir de novo, prévia do pacote). O Orbit nunca executa nada sozinho: cada ação é um clique da pessoa.
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { orbitAnswer } from '@/ai/engine'
import { ASSISTANT_NAME, ASSISTANT_TAGLINE } from '@/ai/identity'
import { classify, isEmergency, isFollowUp } from '@/ai/intent'
import { startTriage, triageReply } from '@/ai/triage'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/state/store'
import { MeasurementDialog } from '@/features/routine/MeasurementDialog'
import { OrbitConversation } from '@/features/assistant/OrbitConversation'
import { OrbitMark } from '@/features/assistant/OrbitMark'
import { PacketPreview } from '@/features/assistant/PacketPreview'
import { GroundReportDialog } from '@/features/assistant/GroundReportDialog'

/** Pausa de "Reading your data…" (ms). Curta: a resposta é local e determinística. */
const THINK_MS = 420
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'
import type { RoutineItem } from '@/domain/types'

/** Responde às perguntas pendentes (das telas, dos chips, do campo). */
function useOrbitResponder() {
  const ctx = useOrbitContext()
  const pending = useOrbitStore((s) => s.pending)
  const aiMode = useAppStore((s) => s.aiMode)
  useEffect(() => {
    if (!pending) return
    const store = useOrbitStore.getState()
    const q = store.takePending()
    if (!q) return
    const at = ctx.simNowIso
    if (q.text) store.push({ role: 'user', text: q.text, at })
    const c = classify(q.text)
    const intent = q.intent ?? c.intent
    if (intent === 'triage') {
      if (isEmergency(q.text)) {
        store.push({ role: 'orbit', reply: triageReply({ step: 'emergency', answers: { what: q.text } }, ctx), at })
      } else if (ctx.role !== 'ASTRONAUT') {
        store.push({
          role: 'orbit',
          at,
          reply: {
            id: `triage-role:${at}`,
            intent: 'triage',
            summary:
              'The symptom check is for the crew member to describe in their own words. I can summarize the data or prepare a handoff.',
            facts: [],
            actions: [{ kind: 'notifyCmo' }],
            engine: 'protocol',
          },
        })
      } else {
        const state = startTriage(q.text)
        store.push({ role: 'orbit', triage: state, at })
      }
      return
    }
    // A resposta anterior dá contexto ao "why?" / "tell me more".
    const previous = [...store.messages].reverse().find((m) => m.reply)?.reply
    store.setBusy(true)
    // Uma pausa curta de "Reading your data…" antes da resposta (o texto depois aparece aos poucos).
    const think = new Promise((r) => window.setTimeout(r, THINK_MS))
    void Promise.all([
      orbitAnswer(
        ctx,
        { ...q, intent: q.intent ?? (previous && isFollowUp(q.text) ? undefined : intent), previous },
        aiMode,
      ),
      think,
    ])
      .then(([reply]) => useOrbitStore.getState().push({ role: 'orbit', reply, at }))
      .finally(() => useOrbitStore.getState().setBusy(false))
  }, [pending, ctx, aiMode])
}

/** Diálogo de medida da ação "Re-measure" (usa o item da rotina do ambiente, se houver). */
function OrbitMeasure() {
  const measure = useOrbitStore((s) => s.measure)
  const setMeasure = useOrbitStore((s) => s.setMeasure)
  const routine = useAppStore((s) => s.routine)
  const environment = useAppStore((s) => s.environment)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const addReading = useAppStore((s) => s.addReading)
  const setRoutineStatus = useAppStore((s) => s.setRoutineStatus)
  const item: RoutineItem | null = measure
    ? (routine.find((r) => r.kind === 'measure' && r.vital === measure && r.environments.includes(environment)) ?? {
        id: `orbit-remeasure-${measure}`,
        title: 'Re-measure',
        kind: 'measure',
        vital: measure,
        time: simNowIso.slice(11, 16),
        environments: [environment],
        status: 'due',
        provenance: { kind: 'simulated', note: 'Re-measure proposed by Orbit' },
      })
    : null
  return (
    <MeasurementDialog
      item={item}
      open={!!measure}
      onOpenChange={(open) => !open && setMeasure(null)}
      nowIso={simNowIso}
      onSave={(it, reading) => {
        addReading(reading)
        setRoutineStatus(it.id, 'done')
        setMeasure(null)
      }}
    />
  )
}

/** Painel da gaveta (420 px; tela cheia abaixo de 1024 px). Não é modal: a tela atrás continua usável. */
function OrbitDrawerPanel() {
  const open = useOrbitStore((s) => s.open)
  const closeDrawer = useOrbitStore((s) => s.closeDrawer)
  const panelRef = useRef<HTMLElement>(null)
  // Ao abrir, foco no campo (a volta do foco ao botão fica no OrbitHost).
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [open])
  if (!open) return null
  return (
    <aside
      ref={panelRef}
      id="orbit-drawer"
      role="dialog"
      aria-modal="false"
      aria-labelledby="orbit-drawer-title"
      data-orbit-drawer
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col gap-3 border-l border-border bg-ground p-4 shadow-2xl lg:w-[420px]"
    >
      <header className="flex items-start gap-3">
        <OrbitMark size="md" decorative />
        <div className="min-w-0 flex-1">
          <h2 id="orbit-drawer-title" className="text-xl">
            {ASSISTANT_NAME}
          </h2>
          <p className="text-xs text-muted">{ASSISTANT_TAGLINE}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close Orbit" onClick={closeDrawer}>
          <X aria-hidden />
        </Button>
      </header>
      <OrbitConversation compact inputId="orbit-drawer-input" />
    </aside>
  )
}

export default function OrbitRuntime() {
  useOrbitResponder()
  return (
    <>
      <OrbitDrawerPanel />
      <OrbitMeasure />
      <PacketPreview />
      <GroundReportDialog />
    </>
  )
}
