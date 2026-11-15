// Data & Sources (F5 #49) — SRC-01, SRC-02, SRC-03. Os controles da demo ficam no botão fixo "Demo"
// (src/features/demo/DemoControls.tsx), disponível em todas as telas.
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useHashParam } from '@/lib/useHashTab'
import { ExternalLink } from 'lucide-react'
import { SOURCES, DONKI_ACKNOWLEDGEMENT } from '@/data/sources'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUtc } from '@/lib/format'

/** Texto curto do link: só o domínio ("ntrs.nasa.gov"); a URL inteira fica no href. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function SourcesPage() {
  // SRC-02: o selo clicado chega aqui como #/sources?src=S07 → destaca e rola até a linha.
  const selected = useHashParam('src')
  useEffect(() => {
    if (selected) document.getElementById(`source-${selected}`)?.scrollIntoView?.({ block: 'center' })
  }, [selected])
  const last = SOURCES[SOURCES.length - 1]!.id

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Reference library</p>
        <h1 className="mt-2 text-3xl">Data &amp; Sources</h1>
        <p className="mt-2 text-muted">Sources and terms behind the prototype.</p>
      </header>

      <Card
        id="source-simulated"
        className={cn(selected === 'simulated' && 'ring-2 ring-link')}
        aria-current={selected === 'simulated' ? 'true' : undefined}
      >
        <CardHeader>
          <CardTitle>About SIMULATED data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            Values marked SIMULATED are synthetic: generated with a fixed seed for this demo scenario. They are not real
            health data from any person.
          </p>
          <p>When a simulated value is based on a published figure, its badge opens that source below.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sources · S01–{last}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="p-3">ID · provider</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Use</th>
                  <th className="p-3">Accessed · terms</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((source) => (
                  <tr
                    key={source.id}
                    id={`source-${source.id}`}
                    aria-current={selected === source.id ? 'true' : undefined}
                    className={cn(
                      'scroll-mt-24 border-b border-border align-top last:border-0',
                      selected === source.id && 'bg-link/10 outline-2 outline-link',
                    )}
                  >
                    <td className="p-3">
                      <span className="num">{source.id}</span>
                      <br />
                      <span className="text-muted">{source.provider}</span>
                    </td>
                    <td className="min-w-64 p-3">
                      <p className="font-medium">{source.title}</p>
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {source.urls.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              title={url}
                              className="inline-flex items-center gap-1 text-xs"
                            >
                              {linkHost(url)}
                              <ExternalLink aria-hidden className="size-3 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="min-w-48 p-3 text-muted">{source.use}</td>
                    <td className="min-w-40 p-3">
                      <span className="num text-xs">{formatUtc(`${source.accessed}T12:00:00Z`).split(',')[0]}</span>
                      <p className="mt-2 text-muted">{source.terms}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* L6: menção de inspiração dos fundos. Nada foi copiado do OriginKit (docs/reference/backdrops.html foi
          desenhado do zero), então não há fonte nova no catálogo — S20 já é o NTRS 20220013418. */}
      <Card id="source-visual">
        <CardHeader>
          <CardTitle>Visual inspiration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            Environment backgrounds: decorative only; no data. Drawn in-house on a 2D canvas, inspired by OriginKit visual
            references. No OriginKit code or assets are used.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acknowledgement</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{DONKI_ACKNOWLEDGEMENT}</p>
        </CardContent>
      </Card>
    </div>
  )
}
