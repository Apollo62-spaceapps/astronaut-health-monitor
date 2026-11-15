// Botão de modo de ambiente (K5 #58, SPEC adendo §17, ENV-01..05).
// Ao clicar, a plataforma inteira troca de modo — como um botão de tema troca um site.
// NÃO é tema escuro: o visual escuro não muda; só a faixa da missão (data-environment) e o
// comportamento (atraso, dose, exercício, rotina, hazards) mudam, via config/environments.ts.
import { Globe, Moon, Rocket, Satellite, type LucideIcon } from 'lucide-react'
import { ENVIRONMENTS } from '@/domain/config/environments'
import { MISSION_MODES, type MissionMode, type MissionProfile } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const ICONS: Record<MissionProfile['icon'], LucideIcon> = { Globe, Satellite, Moon, Rocket }

export function EnvironmentModeButton() {
  const environment = useAppStore((s) => s.environment)
  const setEnvironment = useAppStore((s) => s.setEnvironment)

  return (
    <div className="flex items-center gap-2">
      <span id="env-mode-label" className="text-sm text-white/85">
        Mode:
      </span>
      <ToggleGroup
        type="single"
        value={environment}
        // Radix devolve "" ao clicar no item já ativo: mantém o modo atual (sempre há um modo).
        onValueChange={(v) => v && setEnvironment(v as MissionMode)}
        aria-labelledby="env-mode-label"
        className="rounded-md border border-white/30 bg-black/20"
      >
        {MISSION_MODES.map((mode) => {
          const env = ENVIRONMENTS[mode]
          const Icon = ICONS[env.icon]
          return (
            <ToggleGroupItem
              key={mode}
              value={mode}
              aria-label={env.label}
              className="h-8 gap-1.5 text-white data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-black"
            >
              <Icon aria-hidden className="size-4" />
              {env.label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}
