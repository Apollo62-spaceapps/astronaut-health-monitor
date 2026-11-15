// Demo controls (DEMO-01, DEMO-02): botão fixo "Demo" no canto inferior direito, em todas as telas,
// visualmente separado do produto (borda tracejada, rótulo "Demo"). Tudo o que ele dispara leva "demo" na UI.
import { useState } from 'react'
import { FlaskConical, RotateCcw, Sparkles, Sun, Timer, X } from 'lucide-react'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'

export function DemoControls() {
  const [open, setOpen] = useState(false)
  const replaySolarEvent = useAppStore((s) => s.replaySolarEvent)
  const endShelter = useAppStore((s) => s.endShelter)
  const resetScenario = useAppStore((s) => s.resetScenario)
  const eventReplayed = useAppStore((s) => s.eventReplayed)
  const shelterActive = useAppStore((s) => s.shelterActive)
  const acceleration = useAppStore((s) => s.timeAcceleration)
  const setTimeAcceleration = useAppStore((s) => s.setTimeAcceleration)

  return (
    <div className="fixed right-4 bottom-14 z-40 flex flex-col items-end gap-2">
      {open && (
        <section
          id="demo-controls-panel"
          aria-labelledby="demo-controls-title"
          className="w-[min(420px,calc(100vw-2rem))] space-y-4 rounded-lg border-2 border-dashed border-muted/60 bg-surface p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Demo · not part of the product</p>
              <h2 id="demo-controls-title" className="text-lg">
                Demo controls
              </h2>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close demo controls" onClick={() => setOpen(false)}>
              <X aria-hidden />
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold">Solar event replay</p>
            <p className="text-xs text-muted">Starts the shelter flow and postpones today&apos;s exercise.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={replaySolarEvent} disabled={eventReplayed}>
                <Sun aria-hidden />
                {eventReplayed ? 'Event replayed · demo' : 'Replay solar event · demo'}
              </Button>
              {shelterActive && (
                <Button variant="outline" size="sm" onClick={endShelter}>
                  End shelter · demo
                </Button>
              )}
            </div>
          </div>


          {/* L7 §9.6: roteiro do Orbit (§11) como atalho. Cada botão faz a pergunta e abre a gaveta. */}
          <div className="space-y-1">
            <p className="text-sm font-semibold">Ask Orbit · demo script</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { label: 'Heart zone', q: { text: 'Why is my heart zone attention?', intent: 'zoneExplain', zone: 'heart' } },
                  { label: 'Solar event', q: { text: 'What do I do about the solar event?', intent: 'solarEvent' } },
                  { label: 'I feel dizzy', q: { text: 'I feel dizzy' } },
                  { label: 'Crew outlook', q: { text: 'Who is at higher risk?', intent: 'riskOutlook' } },
                  { label: 'Drift', q: { text: 'Am I drifting from my baseline?', intent: 'drift' } },
                ] as const
              ).map(({ label, q }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    useOrbitStore.getState().ask({ ...q }, { openDrawer: true })
                    setOpen(false)
                  }}
                >
                  <Sparkles aria-hidden />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <label htmlFor="demo-time" className="space-y-1 text-sm font-semibold">
              <span className="block">Time acceleration · demo</span>
              <span className="flex items-center gap-2 font-normal">
                <Timer aria-hidden className="size-4 text-muted" />
                <select
                  id="demo-time"
                  value={acceleration}
                  onChange={(e) => setTimeAcceleration(Number(e.target.value))}
                  className="rounded-md border border-border bg-ground px-2 py-1"
                >
                  <option value={1}>1× · paused</option>
                  <option value={60}>60×</option>
                  <option value={600}>600×</option>
                </select>
              </span>
            </label>
            <Button variant="outline" size="sm" onClick={resetScenario}>
              <RotateCcw aria-hidden />
              Reset scenario · demo
            </Button>
          </div>
        </section>
      )}
      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls="demo-controls-panel"
        aria-label="Demo controls"
        onClick={() => setOpen((v) => !v)}
        className="border-2 border-dashed border-muted/60 bg-surface shadow-lg"
      >
        <FlaskConical aria-hidden />
        Demo
      </Button>
    </div>
  )
}
