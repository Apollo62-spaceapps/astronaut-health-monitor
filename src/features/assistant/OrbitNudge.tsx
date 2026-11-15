// Orbit proativo: quando as REGRAS geram um alerta novo (urgent, projeção R-PROJ-01, vital…), o Orbit avisa sozinho,
// sem esperar a pergunta. Só mostra o que o motor de regras decidiu (AI-07): não cria, não muda nem esconde alerta.
// Respeita a privacidade do perfil (visibleAlerts) e some quando a pessoa dispensa ou abre o Orbit.
import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ASSISTANT_NAME } from '@/ai/identity'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { privacyOf, visibleAlerts } from '@/domain/rules/engine'
import type { Alert } from '@/domain/types'
import { OrbitMark } from '@/features/assistant/OrbitMark'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useAppStore } from '@/state/store'

const KEY = 'orbit-nudge-dismissed'
const readDismissed = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** Ordem: urgent primeiro, depois a projeção (aviso antecipado), depois o resto. */
const priority = (a: Alert) => (a.level === 'urgent' ? 0 : a.ruleId === 'R-PROJ-01' ? 1 : 2)

export function OrbitNudge() {
  const alerts = useAppStore((s) => s.alerts)
  const role = useAppStore((s) => s.role)
  const consent = useAppStore((s) => s.consent)
  const breakGlass = useAppStore((s) => s.breakGlass)
  const drawerOpen = useOrbitStore((s) => s.open)
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  const alert = useMemo(() => {
    const visible = visibleAlerts(alerts, privacyOf({ role, consent, breakGlass }))
    return [...visible].filter((a) => !dismissed.includes(a.id)).sort((a, b) => priority(a) - priority(b))[0]
  }, [alerts, role, consent, breakGlass, dismissed])

  if (!alert || drawerOpen) return null

  const dismiss = () => {
    const next = [...dismissed, alert.id]
    setDismissed(next)
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* sem storage: dispensa só nesta tela */
    }
  }
  const ask = () => {
    dismiss()
    useOrbitStore.getState().ask({ text: 'What should I do now?' }, { openDrawer: true })
  }

  return (
    <aside
      aria-label={`${ASSISTANT_NAME} noticed`}
      className="fixed right-4 bottom-28 z-40 w-[min(22rem,calc(100vw-1.5rem))] space-y-2 rounded-lg border border-border bg-surface p-3 shadow-lg max-md:right-3 max-md:bottom-[calc(8rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-start gap-2">
        <OrbitMark size="sm" decorative className="mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1" role="status" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {ASSISTANT_NAME} noticed{alert.ruleId === 'R-PROJ-01' ? ' · early warning' : ''}
          </p>
          <StatusBadge status={alert.level} />
          <p className="text-sm font-semibold">{alert.title}</p>
          {alert.safeActions.length > 0 && (
            <p className="text-sm text-muted">Safe actions now: {alert.safeActions.join(' · ')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-2"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={ask} className="max-md:h-10">
          Ask {ASSISTANT_NAME} what to do
        </Button>
        <span className="font-mono text-xs text-muted">Rule {alert.ruleId}</span>
      </div>
    </aside>
  )
}
