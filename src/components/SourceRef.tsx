// Referência a uma fonte do catálogo (S01–S20): cada ID vira link para a linha em Data & Sources (SRC-02).
import type { SourceId } from '@/domain/types'
import { cn } from '@/lib/utils'

export const sourceHref = (id: SourceId) => `#/sources?src=${id}`

/** "[S03]" ou "[S08, S09]", cada ID clicável. */
export function SourceRef({ ids, className }: { ids: readonly SourceId[]; className?: string }) {
  if (ids.length === 0) return null
  return (
    <span className={cn('num text-sm whitespace-nowrap', className)}>
      [
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <a href={sourceHref(id)} aria-label={`Source ${id}`}>
            {id}
          </a>
        </span>
      ))}
      ]
    </span>
  )
}
