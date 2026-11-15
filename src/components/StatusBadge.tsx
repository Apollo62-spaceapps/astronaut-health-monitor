// Status = cor + ícone + texto (CORE-03, DESIGN-SYSTEM §1). Hachura no Urgent.
// Nunca use o vermelho da marca (action) para status. Nunca escreva "fit", "healthy" ou diagnóstico.
import { cn } from '@/lib/utils'
import type { ZoneStatus } from '@/domain/types'

export const STATUS_META: Record<ZoneStatus, { label: string; glyph: string; className: string }> = {
  normal: { label: 'Normal', glyph: '✓', className: 'text-normal' },
  attention: { label: 'Attention', glyph: '▲', className: 'text-attention' },
  urgent: { label: 'Urgent', glyph: '●', className: 'text-urgent hatch rounded-sm px-1' },
  restricted: { label: 'Restricted', glyph: '◼', className: 'text-muted' },
  adapting: { label: 'Adapting', glyph: '↻', className: 'text-muted' },
}

interface StatusBadgeProps {
  status: ZoneStatus
  /** Texto extra depois do rótulo, ex.: "+18%". */
  detail?: string
  className?: string
}

export function StatusBadge({ status, detail, className }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  return (
    <span
      data-status={status}
      className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.className, className)}
    >
      <span aria-hidden>{meta.glyph}</span>
      <span>{meta.label}</span>
      {detail && <span className="num font-normal text-muted">· {detail}</span>}
    </span>
  )
}
