// Entrada global do Orbit (L7 §2), no chunk inicial: só o botão "Orbit", o atalho A, o Esc e a volta do foco.
// O runtime (gaveta, respostas, diálogos) é carregado sob demanda na primeira vez que alguém usa o Orbit.
import { lazy, Suspense, useEffect, useRef } from 'react'
import { ASSISTANT_NAME } from '@/ai/identity'
import { Button } from '@/components/ui/button'
import { OrbitMark } from '@/features/assistant/OrbitMark'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { OrbitNudge } from '@/features/assistant/OrbitNudge'

const OrbitRuntime = lazy(() => import('@/features/assistant/OrbitRuntime'))

export function OrbitHost({ showLauncher }: { showLauncher: boolean }) {
  const open = useOrbitStore((s) => s.open)
  const activated = useOrbitStore((s) => s.activated)
  const openDrawer = useOrbitStore((s) => s.openDrawer)
  const closeDrawer = useOrbitStore((s) => s.closeDrawer)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  // Atalho A (sem campo de texto em foco) abre; Esc fecha.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        !!el?.isContentEditable
      if (e.key === 'Escape' && useOrbitStore.getState().open) {
        // Um diálogo (medida, pacote) aberto por cima fecha primeiro.
        if (document.querySelector('[role="dialog"][data-state="open"]:not([data-orbit-drawer])')) return
        closeDrawer()
      } else if ((e.key === 'a' || e.key === 'A') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        openDrawer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openDrawer, closeDrawer])

  // Ao fechar, o foco volta ao botão.
  useEffect(() => {
    if (!open && wasOpen.current) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  return (
    <>
      {showLauncher && !open && (
        <Button
          ref={launcherRef}
          variant="outline"
          aria-expanded={open}
          aria-controls="orbit-drawer"
          aria-keyshortcuts="A"
          title="Open Orbit (A)"
          onClick={openDrawer}
          className="fixed right-36 bottom-14 z-40 bg-surface shadow-lg max-md:right-[7rem] max-md:bottom-[calc(4.25rem+env(safe-area-inset-bottom))]"
        >
          <OrbitMark size="sm" decorative />
          {ASSISTANT_NAME}
        </Button>
      )}
      {showLauncher && <OrbitNudge />}
      {activated && (
        <Suspense fallback={null}>
          <OrbitRuntime />
        </Suspense>
      )}
    </>
  )
}
