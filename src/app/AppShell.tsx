import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { useHashTab } from '@/lib/useHashTab'
import { TABS, type TabId } from '@/app/tabs'
import { MissionBanner } from '@/app/MissionBanner'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { VitalsPage } from '@/features/vitals/VitalsPage'
import { RoutinePage } from '@/features/routine/RoutinePage'
import { RadiationPage } from '@/features/radiation/RadiationPage'
import { ExercisePage } from '@/features/exercise/ExercisePage'
import { WellbeingPage } from '@/features/wellbeing/WellbeingPage'
import { CommsPage } from '@/features/escalation/CommsPage'
import { AssistantPage } from '@/features/assistant/AssistantPage'
import { SourcesPage } from '@/features/sources/SourcesPage'

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

  return (
    <div className="flex min-h-screen min-w-[1280px] flex-col bg-ground">
      {/* Header (ground #000) — DESIGN-SYSTEM §4 */}
      <header className="flex h-14 items-center justify-between px-6">
        <span className="text-lg font-extrabold tracking-tight">APOLLO 62</span>
        <span className="text-sm text-muted">Astronaut health monitor · prototype</span>
      </header>

      {/* Faixa da missão (K4). O botão de modo de ambiente (K5) entra em envSlot. */}
      <MissionBanner envSlot={<span className="text-sm text-white/85">Environment mode button — task K5 #58</span>} />

      <div className="flex flex-1">
        <nav aria-label="Sections" className="w-56 shrink-0 border-r border-border p-3">
          <ul className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#/${id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    go(id)
                  }}
                  aria-current={tab === id ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-foreground no-underline hover:bg-surface-2 hover:no-underline',
                    tab === id && 'bg-surface font-semibold',
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 p-6">
          <Page />
        </main>
      </div>

      <footer className="border-t border-border px-6 py-3 text-sm text-muted">{DISCLAIMER}</footer>
    </div>
  )
}
