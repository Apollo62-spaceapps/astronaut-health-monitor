import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useHashParam } from '@/lib/useHashTab'
import { ChevronDown, ExternalLink, RotateCcw, Sun, Timer } from 'lucide-react'
import { SOURCES, DONKI_ACKNOWLEDGEMENT } from '@/data/sources'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAiEngineSwitch } from '@/features/assistant/useAiEngineSwitch'

export function SourcesPage() {
  const replaySolarEvent = useAppStore((s) => s.replaySolarEvent)
  const resetScenario = useAppStore((s) => s.resetScenario)
  const eventReplayed = useAppStore((s) => s.eventReplayed)
  // Mesma troca de motor da aba Assistant: o modelo de bordo passa pelo init() (AI-03).
  const { aiMode, switchTo, loading, notice } = useAiEngineSwitch()
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const setTimeAcceleration = useAppStore((s) => s.setTimeAcceleration)
  const [open, setOpen] = useState(false)
  // SRC-02: o selo clicado chega aqui como #/sources?src=S07 → destaca e rola até a linha.
  const selected = useHashParam('src')
  useEffect(() => {
    if (selected) document.getElementById(`source-${selected}`)?.scrollIntoView?.({ block: 'center' })
  }, [selected])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Reference library · SRC-01, SRC-03</p>
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
          <CardTitle>Sources · S01–S19</CardTitle>
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
                      <span className="font-mono">{source.id}</span>
                      <br />
                      <span className="text-muted">{source.provider}</span>
                    </td>
                    <td className="min-w-64 p-3">
                      <p className="font-medium">{source.title}</p>
                      <ul className="mt-2 space-y-1">
                        {source.urls.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex max-w-80 items-center gap-1 break-all text-xs"
                            >
                              <span>{url}</span>
                              <ExternalLink aria-hidden className="size-3 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="min-w-48 p-3 text-muted">{source.use}</td>
                    <td className="min-w-40 p-3">
                      <span className="font-mono text-xs">{source.accessed}</span>
                      <p className="mt-2 text-muted">{source.terms}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DONKI acknowledgement · P-06</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{DONKI_ACKNOWLEDGEMENT.replace(/\s*\[Wording pending P-06:.*\]$/, '')}</p>
          <p className="mt-2 text-sm text-muted">Final wording remains subject to the CCMC publication policy (S06).</p>
        </CardContent>
      </Card>

      <section className="rounded-lg border border-border bg-surface-2 p-5" aria-labelledby="demo-controls-title">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between text-left"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Demo · simulated controls
            </span>
            <span id="demo-controls-title" className="mt-1 block text-xl font-semibold">
              Demo controls
            </span>
          </span>
          <ChevronDown aria-hidden className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
            <div className="space-y-2">
              <p className="font-semibold">Solar event replay</p>
              <p className="text-sm text-muted">Starts the simulated shelter flow and postpones today's exercise.</p>
              <Button variant="outline" onClick={replaySolarEvent} disabled={eventReplayed}>
                <Sun aria-hidden />
                {eventReplayed ? 'Event replayed · demo' : 'Replay solar event · demo'}
              </Button>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">AI engine</p>
              <p className="text-sm text-muted">Switches the selected assistant engine. Alerts remain rule-driven.</p>
              <Button
                variant="outline"
                disabled={loading !== null}
                onClick={() => void switchTo(aiMode === 'protocol' ? 'onboard-model' : 'protocol')}
              >
                Switch to {aiMode === 'protocol' ? 'onboard model' : 'protocol mode'} · demo
              </Button>
              <p className="text-xs text-muted">Current: {aiMode === 'protocol' ? 'Protocol mode' : 'Onboard model'}</p>
              {loading && (
                <div aria-live="polite" className="space-y-1">
                  <Progress value={Math.round(loading.p * 100)} aria-label="Onboard model loading" />
                  <p className="text-xs text-muted">{loading.text}</p>
                </div>
              )}
              {notice && (
                <p role="status" className="text-xs text-muted">
                  {notice}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="demo-time" className="font-semibold">
                Time acceleration · demo
              </label>
              <p className="text-sm text-muted">Speeds up the local mission clock and simulated reminders.</p>
              <div className="flex items-center gap-2">
                <Timer aria-hidden className="size-4 text-muted" />
                <select
                  id="demo-time"
                  value={acceleration}
                  onChange={(e) => setTimeAcceleration(Number(e.target.value))}
                  className="rounded-md border border-border bg-ground px-3 py-2"
                >
                  <option value={1}>1× · paused</option>
                  <option value={60}>60×</option>
                  <option value={600}>600×</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">Reset scenario</p>
              <p className="text-sm text-muted">Restores the starting simulated data for the demo.</p>
              <Button variant="outline" onClick={resetScenario}>
                <RotateCcw aria-hidden />
                Reset scenario · demo
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
