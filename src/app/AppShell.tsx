import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { useHashTab } from '@/lib/useHashTab'
import { TABS, type TabId } from '@/app/tabs'
import { MissionBanner } from '@/app/MissionBanner'
import { EnvironmentModeButton } from '@/features/environment/EnvironmentModeButton'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { VitalsPage } from '@/features/vitals/VitalsPage'
import { RoutinePage } from '@/features/routine/RoutinePage'
import { RadiationPage } from '@/features/radiation/RadiationPage'
import { ExercisePage } from '@/features/exercise/ExercisePage'
import { WellbeingPage } from '@/features/wellbeing/WellbeingPage'
import { CommsPage } from '@/features/escalation/CommsPage'
import { AssistantPage } from '@/features/assistant/AssistantPage'
import { SourcesPage } from '@/features/sources/SourcesPage'
import { DemoControls } from '@/features/demo/DemoControls'
import { useEffect } from 'react'
import { useAppStore } from '@/state/store'

const PAGES: Record<TabId, ComponentType> = {
  overview: OverviewPage,
  vitals: VitalsPage,
  routine: RoutinePage,
  radiation: RadiationPage,
  exercise: ExercisePage,
  wellbeing: WellbeingPage,
  comms: CommsPage,
  assistant: AssistantPage,
  sources: SourcesPage,
}

/** Rodapé fixo obrigatório (NFR-08). Não remover. */
export const DISCLAIMER = 'Decision-support prototype — not a medical device, not for diagnosis. Some data simulated.'

export function AppShell() {
  const [tab, go] = useHashTab()
  const Page = PAGES[tab]
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const advanceDemoMinutes = useAppStore((s) => s.advanceDemoMinutes)
  useEffect(() => {
    if (acceleration <= 1) return
    const timer = window.setInterval(() => advanceDemoMinutes(acceleration), 1000)
    return () => window.clearInterval(timer)
  }, [acceleration, advanceDemoMinutes])

  return (
    // Sem largura mínima fixa: nada de rolagem horizontal em 1280/1366 px (nem com a barra de rolagem vertical).
    <div className="flex min-h-screen flex-col bg-ground">
      {/* Header (ground #000) — DESIGN-SYSTEM §4 */}
      <header className="flex h-11 items-center justify-between gap-4 px-6">
        <span className="text-lg font-semibold tracking-wider">APOLLO 62</span>
        <span className="truncate text-sm text-muted">Astronaut health monitor · prototype</span>
      </header>

      {/* Faixa da missão (K4) com o botão de modo de ambiente (K5). */}
      <MissionBanner envSlot={<EnvironmentModeButton />} />

      <div className="flex min-w-0 flex-1">
        {/* ≤ 1100 px: a sidebar vira só ícones (o nome continua acessível e no title). */}
        <nav aria-label="Sections" className="w-14 shrink-0 border-r border-border p-2 min-[1101px]:w-56 min-[1101px]:p-3">
          <ul className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#/${id}`}
                  title={label}
                  onClick={(e) => {
                    e.preventDefault()
                    go(id)
                  }}
                  aria-current={tab === id ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-surface-2 hover:no-underline min-[1101px]:justify-start min-[1101px]:px-3',
                    tab === id && 'bg-surface font-semibold',
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="sr-only min-[1101px]:not-sr-only">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 p-6">
          {/* Regra única de largura para todas as telas (polimento 15/11). */}
          <div className="mx-auto w-full max-w-[1280px]">
            <Page />
          </div>
        </main>
      </div>

      <footer className="border-t border-border px-6 py-3 text-sm text-muted">{DISCLAIMER}</footer>
      <DemoControls />
    </div>
  )
}
