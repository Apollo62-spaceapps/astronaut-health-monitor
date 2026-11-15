// Status = cor + ícone + texto (CORE-03, DESIGN-SYSTEM §1). Hachura no Urgent.
// Nunca use o vermelho da marca (action) para status. Nunca escreva "fit", "healthy" ou diagnóstico.
import { cn } from '@/lib/utils'
import type { ZoneStatus } from '@/domain/types'

export const STATUS_META: Record<ZoneStatus, { label: string; glyph: string; className: string }> = {
  normal: { label: 'Normal', glyph: '✓', className: 'text-normal border-normal/50' },
  attention: { label: 'Attention', glyph: '▲', className: 'text-attention border-attention/50' },
  urgent: { label: 'Urgent', glyph: '●', className: 'text-urgent border-urgent/60 hatch' },
  restricted: { label: 'Restricted', glyph: '◼', className: 'text-muted border-muted/50' },
  adapting: { label: 'Adapting', glyph: '↻', className: 'text-muted border-muted/50' },
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
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-semibold',
        meta.className,
        className,
      )}
    >
      <span aria-hidden>{meta.glyph}</span>
      <span>{meta.label}</span>
      {detail && <span className="num font-normal">· {detail}</span>}
    </span>
  )
}
