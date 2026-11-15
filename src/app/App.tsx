import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/app/AppShell'
import { useEnvironmentAttribute } from '@/app/useEnvironmentAttribute'
import { useRulesEngineSync } from '@/state/useEngine'

export default function App() {
  useEnvironmentAttribute()
  useRulesEngineSync() // motor de regras → store.alerts (L2 #53)
  return (
    <TooltipProvider>
      <AppShell />
    </TooltipProvider>
  )
}
