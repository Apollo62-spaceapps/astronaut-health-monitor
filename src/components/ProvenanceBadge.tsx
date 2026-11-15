// Selo de proveniência: todo número na tela mostra REAL ou SIMULATED (NFR-05, DESIGN-SYSTEM §3).
// Clicar leva à página Data & Sources (SRC-02).
import { cn } from '@/lib/utils'
import type { Provenance, SourceId } from '@/domain/types'

/** Nome curto da fonte para o selo REAL (ex.: "REAL · DONKI"). */
const SHORT: Partial<Record<SourceId, string>> = {
  S03: 'NASA OCHMO',
  S05: 'NASA Orion',
  S07: 'DONKI',
  S08: 'MSL/RAD',
  S09: 'MSL/RAD',
  S10: 'NASA NTRS',
  S11: 'NASA NTRS',
  S13: 'NASA',
  S19: 'NASA HRP',
}

export function provenanceLabel(p: Provenance): string {
  return p.kind === 'real' ? `REAL · ${SHORT[p.sourceId] ?? p.sourceId}` : 'SIMULATED'
}

export function ProvenanceBadge({ provenance, className }: { provenance: Provenance; className?: string }) {
  const label = provenanceLabel(provenance)
  const title = provenance.note ?? (provenance.kind === 'real' ? 'Real data — see Data & Sources' : 'Simulated data')
  return (
    <a
      href="#/sources"
      title={title}
      className={cn(
        'inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider no-underline hover:no-underline',
        provenance.kind === 'real' ? 'bg-link/15 text-link' : 'bg-white/10 text-muted',
        className,
      )}
    >
      {label}
    </a>
  )
}
