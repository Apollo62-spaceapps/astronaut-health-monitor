// Rótulo único do dia (eyebrow) para todas as telas: "Mission day 120 · Spacecraft · Simulated".
// Na Earth (pré-voo / pós-voo) não existe "dia de missão": vira "Scenario day 120 · Earth (pre-flight / post-flight)".
import { ENVIRONMENTS } from '@/domain/config/environments'
import { useAppStore } from '@/state/store'
import { cn } from '@/lib/utils'

export function useDayLabel(): { prefix: string; day: number; place: string } {
  const environment = useAppStore((s) => s.environment)
  const day = useAppStore((s) => s.missionDay)
  return environment === 'EARTH'
    ? { prefix: 'Scenario day', day, place: 'Earth (pre-flight / post-flight)' }
    : { prefix: 'Mission day', day, place: ENVIRONMENTS[environment].label }
}

export function DayLabel({ extra, className }: { extra?: string; className?: string }) {
  const { prefix, day, place } = useDayLabel()
  return (
    <p className={cn('text-xs font-semibold uppercase tracking-wider text-muted', className)}>
      {prefix} <span className="num">{day}</span> · {place} · Simulated{extra ? ` · ${extra}` : ''}
    </p>
  )
}
