import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { useHashTab } from '@/lib/useHashTab'
import { TABS, type TabId } from '@/app/tabs'
import { MissionBanner } from '@/app/MissionBanner'
import { EnvironmentModeButton } from '@/features/environment/EnvironmentModeButton'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { VitalsPage } from '@/features/vitals/VitalsPage'
import { RadiationPage } from '@/features/radiation/RadiationPage'
import { ExercisePage } from '@/features/exercise/ExercisePage'
import { WellbeingPage } from '@/features/wellbeing/WellbeingPage'
import { SourcesPage } from '@/features/sources/SourcesPage'
import { OrbitHost } from '@/features/assistant/OrbitHost'
import { ShieldCheck, WifiOff } from 'lucide-react'
import { useOnline } from '@/lib/useOnline'
import { DemoControls } from '@/features/demo/DemoControls'
import { EnvironmentBackdrop } from '@/features/environment/backdrops/EnvironmentBackdrop'
import { lazy, Suspense, useEffect } from 'react'
import { useAppStore } from '@/state/store'

// L7: as telas do Orbit, do Crew outlook e do Baseline são carregadas sob demanda (o chunk inicial não cresce).
const AssistantPage = lazy(() => import('@/features/assistant/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const OutlookPage = lazy(() => import('@/features/outlook/OutlookPage').then((m) => ({ default: m.OutlookPage })))
const ReferencePage = lazy(() => import('@/features/reference/ReferencePage').then((m) => ({ default: m.ReferencePage })))

const PAGES: Record<TabId, ComponentType> = {
  overview: OverviewPage,
  vitals: VitalsPage,
  reference: ReferencePage,
  radiation: RadiationPage,
  exercise: ExercisePage,
  wellbeing: WellbeingPage,
  outlook: OutlookPage,
  assistant: AssistantPage,
  sources: SourcesPage,
}

/** Nome curto na barra inferior do celular (cabe em ~68 px); o nome completo segue no title e no leitor de tela. */
const SHORT_LABEL: Partial<Record<TabId, string>> = { outlook: 'Crew', sources: 'Sources' }

/** Rodapé fixo obrigatório (NFR-08). Não remover. */
export const DISCLAIMER = 'Decision-support prototype — not a medical device, not for diagnosis. Some data simulated.'

export function AppShell() {
  const [tab, go] = useHashTab()
  const Page = PAGES[tab]
  const online = useOnline()
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const advanceDemoMinutes = useAppStore((s) => s.advanceDemoMinutes)
  useEffect(() => {
    if (acceleration <= 1) return
    const timer = window.setInterval(() => advanceDemoMinutes(acceleration), 1000)
    return () => window.clearInterval(timer)
  }, [acceleration, advanceDemoMinutes])

  return (
    // Sem largura mínima fixa: nada de rolagem horizontal em 1280/1366 px (nem com a barra de rolagem vertical).
    // `isolate`: o fundo decorativo (z-index −1) pinta acima do bg-ground do shell e abaixo do conteúdo.
    <div className="relative isolate flex min-h-screen flex-col bg-ground">
      <EnvironmentBackdrop />
      {/* Header (ground #000) — DESIGN-SYSTEM §4 */}
      <header className="flex h-11 items-center justify-between gap-3 bg-ground px-4 md:gap-4 md:px-6">
        <span className="shrink-0 text-lg font-semibold tracking-wider whitespace-nowrap">APOLLO 62</span>
        <span className="flex min-w-0 items-center gap-4">
          {/* L7 §9.7: tudo roda local; o selo sustenta o "works without Earth" (ícone + texto). */}
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted" role="status">
            {online ? <ShieldCheck aria-hidden className="size-3.5" /> : <WifiOff aria-hidden className="size-3.5" />}
            {online ? (
              <>
                <span className="max-sm:hidden">Online · works offline</span>
                <span className="sm:hidden">Works offline</span>
              </>
            ) : (
              'Offline · running locally'
            )}
          </span>
          <span className="truncate text-sm text-muted max-md:hidden">Astronaut health monitor · prototype</span>
        </span>
      </header>

      {/* Faixa da missão (K4) com o botão de modo de ambiente (K5). */}
      <MissionBanner envSlot={<EnvironmentModeButton />} />

      <div className="flex min-w-0 flex-1">
        {/* ≥ 1101 px: sidebar com nome. 768–1100 px: só ícones (nome no title e para leitor de tela).
            < 768 px (celular): vira barra inferior fixa, rolável, com ícone + nome curto (alvo de toque ≥ 48 px). */}
        <nav
          aria-label="Sections"
          className={cn(
            'on-backdrop shrink-0',
            'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:border-t max-md:border-border max-md:bg-ground max-md:pb-[env(safe-area-inset-bottom)]',
            // Dois breakpoints arbitrários (ordenados pelo valor): com md: + min-[1101px]: o md vencia e a sidebar
            // larga ficava com 56 px no desktop.
            'md:border-r md:border-border min-[768px]:w-14 min-[768px]:p-2 min-[1101px]:w-56 min-[1101px]:p-3',
          )}
        >
          <ul className="max-md:flex max-md:overflow-x-auto max-md:[scrollbar-width:none] md:space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="max-md:flex-1">
                <a
                  href={`#/${id}`}
                  title={label}
                  aria-label={label}
                  onClick={(e) => {
                    e.preventDefault()
                    go(id)
                  }}
                  aria-current={tab === id ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-center gap-3 rounded-md px-2 py-2 text-foreground no-underline hover:bg-surface-2 hover:no-underline min-[1101px]:justify-start min-[1101px]:px-3',
                    'max-md:h-14 max-md:min-w-[4.25rem] max-md:flex-col max-md:gap-1 max-md:rounded-none max-md:px-1 max-md:py-1.5',
                    tab === id && 'bg-surface font-semibold max-md:shadow-[inset_0_2px_0_var(--color-foreground)]',
                  )}
                >
                  <Icon aria-hidden className="size-5 shrink-0 md:size-4" />
                  <span aria-hidden className="text-[11px] leading-none whitespace-nowrap md:hidden">
                    {SHORT_LABEL[id] ?? label}
                  </span>
                  <span className="sr-only min-[1101px]:not-sr-only">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* on-backdrop: halo escuro no texto que fica direto sobre o fundo do ambiente (index.css). */}
        <main className="on-backdrop min-w-0 flex-1 p-4 md:p-6">
          {/* Regra única de largura para todas as telas (polimento 15/11). */}
          <div className="mx-auto w-full max-w-[1280px]">
            <Suspense fallback={<p className="text-muted">Loading…</p>}>
              <Page />
            </Suspense>
          </div>
        </main>
      </div>

      {/* No celular, o rodapé ganha espaço para não ficar atrás da barra inferior de navegação. */}
      <footer className="border-t border-border bg-ground px-4 py-3 text-sm text-muted max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:px-6">
        {DISCLAIMER}
      </footer>
      <DemoControls />
      {/* Orbit (L7): gaveta global, atalho A, e os diálogos das ações propostas. */}
      <OrbitHost showLauncher={tab !== 'assistant'} />
    </div>
  )
}
