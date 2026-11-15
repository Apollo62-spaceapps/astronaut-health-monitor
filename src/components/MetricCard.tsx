// Cartão de métrica (DESIGN-SYSTEM §3/§4): rótulo pequeno em caixa alta, número grande em mono,
// linha de status (ícone + texto) e selo de proveniência.
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Provenance, ZoneStatus } from '@/domain/types'
import { StatusBadge } from '@/components/StatusBadge'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'

interface MetricCardProps {
  /** Ex.: "HEART RATE · REST" (pode passar em sentence case; vira caixa alta). */
  label: string
  /** Ex.: "84" ou "121/79". */
  value: string
  /** Ex.: "bpm", "%". */
  unit?: string
  status?: ZoneStatus
  /** Ex.: "+18%". */
  statusDetail?: string
  /** Linha secundária, ex.: "of 600 mSv" ou "6-day streak". */
  caption?: ReactNode
  provenance: Provenance
  className?: string
  children?: ReactNode
}

export function MetricCard({
  label,
  value,
  unit,
  status,
  statusDetail,
  caption,
  provenance,
  className,
  children,
}: MetricCardProps) {
  return (
    <section aria-label={label} className={cn('flex flex-col gap-2 rounded-lg bg-surface p-4', className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</h3>
      <p className="num text-3xl font-semibold">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-muted">{unit}</span>}
      </p>
      {status && <StatusBadge status={status} detail={statusDetail} className="self-start" />}
      {caption && <p className="text-sm text-muted">{caption}</p>}
      {children}
      <ProvenanceBadge provenance={provenance} className="self-start" />
    </section>
  )
}
