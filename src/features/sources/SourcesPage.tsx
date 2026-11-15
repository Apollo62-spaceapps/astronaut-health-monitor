// Data & Sources (F5 #49) — SRC-01, SRC-02, SRC-03. Os controles da demo ficam no botão fixo "Demo"
// (src/features/demo/DemoControls.tsx), disponível em todas as telas.
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useHashParam } from '@/lib/useHashTab'
import { ExternalLink } from 'lucide-react'
import { SOURCES, DONKI_ACKNOWLEDGEMENT, SSM_CAVEAT } from '@/data/sources'
import { SourceRef } from '@/components/SourceRef'
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
            {/* Celular (< 768 px): cada linha vira um bloco empilhado, sem rolagem lateral; o cabeçalho fica só para leitor de tela. */}
            <table className="w-full border-collapse text-left text-sm max-md:block">
              <thead className="max-md:sr-only">
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="p-3">ID · provider</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Use</th>
                  <th className="p-3">Accessed · terms</th>
                </tr>
              </thead>
              <tbody className="max-md:block">
                {SOURCES.map((source) => (
                  <tr
                    key={source.id}
                    id={`source-${source.id}`}
                    aria-current={selected === source.id ? 'true' : undefined}
                    className={cn(
                      'scroll-mt-24 border-b border-border align-top last:border-0 max-md:block max-md:space-y-3 max-md:py-4',
                      selected === source.id && 'bg-link/10 outline-2 outline-link max-md:px-3',
                    )}
                  >
                    <td className="p-3 max-md:block max-md:p-0">
                      <span className="num">{source.id}</span>
                      <br className="max-md:hidden" />
                      <span aria-hidden className="text-muted md:hidden">
                        {' · '}
                      </span>
                      <span className="text-muted">{source.provider}</span>
                    </td>
                    <td className="p-3 max-md:block max-md:p-0 md:min-w-64">
                      <p className="font-medium">{source.title}</p>
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 max-md:mt-1 max-md:gap-y-0">
                        {source.urls.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              title={url}
                              className="inline-flex items-center gap-1 text-xs [overflow-wrap:anywhere] max-md:min-h-10 max-md:text-sm"
                            >
                              {linkHost(url)}
                              <ExternalLink aria-hidden className="size-3 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 text-muted max-md:block max-md:p-0 md:min-w-48">
                      <span aria-hidden className="block text-xs font-semibold tracking-wider uppercase md:hidden">
                        Use
                      </span>
                      {source.use}
                    </td>
                    <td className="p-3 max-md:block max-md:p-0 md:min-w-40">
                      <span aria-hidden className="block text-xs font-semibold tracking-wider text-muted uppercase md:hidden">
                        Accessed · terms
                      </span>
                      <span className="num text-xs">{formatUtc(`${source.accessed}T12:00:00Z`).split(',')[0]}</span>
                      <p className="mt-2 text-muted max-md:mt-1">{source.terms}</p>
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
      {/* L7 §9.5 e §5C: como o Orbit funciona e a ressalva das Standard Measures. */}
      <Card id="source-orbit">
        <CardHeader>
          <CardTitle>How Orbit works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            Orbit has three layers, all onboard and offline. A deterministic rule engine decides every color, alert and
            escalation. Orbit answers from a local library of short passages drawn from the NASA
            sources below (a small retrieval index, “edge RAG”) and cites them in the text. An optional on-device model
            only rewrites the wording and is checked against the same facts. The crew stays in the loop for every
            action, and reports go to the flight surgeons for asynchronous review. Inspired by NASA research on
            Earth-independent medical operations <SourceRef ids={['S12']} />; related context{' '}
            <SourceRef ids={['S15']} />. Not endorsed by or used by NASA.
          </p>
          <p>
            {SSM_CAVEAT} <SourceRef ids={['S28']} />
          </p>
        </CardContent>
      </Card>

      <Card id="source-visual">
        <CardHeader>
          <CardTitle>Visual inspiration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            Environment backgrounds: decorative only; no data. Drawn in-house on a 2D canvas, inspired by OriginKit
            visual references. No OriginKit code or assets are used.
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
