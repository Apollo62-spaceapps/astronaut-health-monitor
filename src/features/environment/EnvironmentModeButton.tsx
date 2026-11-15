// Botão de modo de ambiente (K5 #58, SPEC adendo §17, ENV-01..05).
// Ao clicar, a plataforma inteira troca de modo — como um botão de tema troca um site.
// NÃO é tema escuro: o visual escuro não muda; só a faixa da missão (data-environment), o fundo
// decorativo (L6) e o comportamento (atraso, dose, exercício, rotina, hazards) mudam.
//
// L6 (15/11): controle segmentado próprio, sem ToggleGroup. O Toggle do shadcn tem
// `hover:bg-muted hover:text-muted-foreground`, que sobre a faixa deixava o texto cinza sobre cinza.
// Semântica de radiogroup com tabindex "roving": só o selecionado entra no Tab; setas trocam o modo.
import { useRef, type KeyboardEvent } from 'react'
import { Globe, Moon, Rocket, Satellite, type LucideIcon } from 'lucide-react'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { MISSION_MODES, type MissionMode, type MissionProfile } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { cn } from '@/lib/utils'

const ICONS: Record<MissionProfile['icon'], LucideIcon> = { Globe, Satellite, Moon, Rocket }

export function EnvironmentModeButton() {
  const environment = useAppStore((s) => s.environment)
  const setEnvironment = useAppStore((s) => s.setEnvironment)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const select = (mode: MissionMode) => {
    // Clicar no modo já ativo não faz nada (sempre há um modo).
    if (mode !== environment) setEnvironment(mode)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = MISSION_MODES.length - 1
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (index + 1) % MISSION_MODES.length
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (index + last) % MISSION_MODES.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null
    const mode = next === null ? undefined : MISSION_MODES[next]
    if (next === null || !mode) return
    e.preventDefault()
    select(mode)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex items-center gap-2">
      <span id="env-mode-label" className="text-sm text-white/85 max-lg:sr-only">
        Mode:
      </span>
      <div role="radiogroup" aria-labelledby="env-mode-label" className="inline-flex gap-0.5 rounded-md bg-black/30 p-0.5">
        {MISSION_MODES.map((mode, i) => {
          const env = ENVIRONMENTS[mode]
          const Icon = ICONS[env.icon]
          const checked = mode === environment
          return (
            <button
              key={mode}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={env.label}
              title={env.label}
              tabIndex={checked ? 0 : -1}
              onClick={() => select(mode)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'inline-flex h-9 min-w-10 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded px-3 text-sm transition-colors select-none lg:h-8',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                // Ativo: branco com texto preto, sem hover. Inativo: texto sempre branco; hover só clareia o fundo.
                checked ? 'bg-white font-semibold text-black' : 'text-white hover:bg-white/15',
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {/* Telas estreitas: só o modo ativo mostra o nome (os outros ficam com ícone + aria-label). */}
              <span className={checked ? undefined : 'max-lg:sr-only'}>{env.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
