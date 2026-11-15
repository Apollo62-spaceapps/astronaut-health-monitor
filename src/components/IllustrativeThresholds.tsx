// Selo obrigatório sempre que um status usar os limiares placeholder de P-01 (CORE-04).
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function IllustrativeThresholds({ className }: { className?: string }) {
  return (
    <span
      title="Thresholds are illustrative placeholders (pending P-01), not clinical criteria."
      className={cn('inline-flex items-center gap-1 text-xs text-muted', className)}
    >
      <Info aria-hidden className="size-3.5" />
      Illustrative thresholds
    </span>
  )
}
