import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/app/AppShell'
import { useEnvironmentAttribute } from '@/app/useEnvironmentAttribute'

export default function App() {
  useEnvironmentAttribute()
  return (
    <TooltipProvider>
      <AppShell />
    </TooltipProvider>
  )
}
