// Relatório completo para os flight surgeons (L7b, pitch passo 4). O Orbit monta, a pessoa revisa e decide:
// baixar (.md), imprimir/salvar em PDF ou pôr na fila para a Terra. Nada sai sem confirmação.
import { useMemo, useState } from 'react'
import { Download, Printer, Send } from 'lucide-react'
import { buildGroundReport } from '@/ai/report'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/state/store'
import { useOrbitStore } from '@/features/assistant/orbitStore'
import { useOrbitContext } from '@/features/assistant/useOrbitContext'

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

export function GroundReportDialog() {
  const open = useOrbitStore((s) => s.reportOpen)
  const setOpen = useOrbitStore((s) => s.setReportOpen)
  const messages = useOrbitStore((s) => s.messages)
  const push = useOrbitStore((s) => s.push)
  const enqueuePacket = useAppStore((s) => s.enqueuePacket)
  const ctx = useOrbitContext()
  const [includeWellbeing, setIncludeWellbeing] = useState(true)
  const crewReports = useMemo(
    () => messages.flatMap((m) => (m.reply?.intent === 'triage' && m.reply.report ? [m.reply.report] : [])),
    [messages],
  )
  const report = useMemo(
    () => (open ? buildGroundReport(ctx, { includeWellbeing, crewReports }) : null),
    [open, ctx, includeWellbeing, crewReports],
  )
  const kb = report ? (report.bytes / 1024).toFixed(1) : '0'

  const download = () => {
    if (!report) return
    const url = URL.createObjectURL(new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `ground-report-day-${ctx.missionDay}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
  const print = () => {
    if (!report) return
    const w = window.open('', '_blank', 'noopener=no')
    if (!w) return
    w.document.write(
      `<!doctype html><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><pre style="font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap;margin:24px">${escapeHtml(report.markdown)}</pre>`,
    )
    w.document.close()
    w.focus()
    w.print()
  }
  const queue = () => {
    if (!report) return
    enqueuePacket(
      report.packetSummary,
      ctx.alerts.some((a) => a.level === 'urgent') || ctx.shelterActive ? 'priority' : 'normal',
    )
    push({
      role: 'orbit',
      at: ctx.simNowIso,
      reply: {
        id: `report-queued:${ctx.simNowIso}`,
        intent: 'groundReport',
        summary: `Ground report queued (${kb} kB).`,
        prose: [
          `Done: the ground report (${kb} kB) is queued for the flight surgeons. ${ctx.groundReplySec === 0 ? 'They are available now.' : `A reply would take about ${Math.round(ctx.groundReplySec / 60) || ctx.groundReplySec} ${ctx.groundReplySec >= 60 ? 'minutes' : 'seconds'}, so keep following the safe actions meanwhile.`}`,
        ],
        facts: [],
        actions: [],
        engine: 'protocol',
      },
    })
    setOpen(false)
  }

  return (
    <Dialog open={!!report} onOpenChange={setOpen}>
      {/* Celular: o diálogo rola por dentro e nunca passa da tela. */}
      <DialogContent className="max-sm:max-h-[calc(100dvh-2rem)] max-sm:overflow-y-auto max-sm:p-4 sm:max-w-3xl">
        <DialogHeader className="max-sm:px-6">
          <DialogTitle>Ground report for the flight surgeons</DialogTitle>
          <DialogDescription>
            Drafted by Orbit from the rule engine. Plain text, {kb} kB — small enough for a low-bandwidth window.
            Nothing is sent until you confirm.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm max-sm:min-h-10">
          <input
            type="checkbox"
            className="shrink-0 max-sm:size-5"
            checked={includeWellbeing}
            onChange={(e) => setIncludeWellbeing(e.target.checked)}
          />
          Include my mood and sleep (private; flight surgeons can see them)
        </label>
        <pre
          aria-label="Report preview"
          className="max-h-[50vh] overflow-auto max-sm:max-h-[40dvh] rounded-md bg-surface-2 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
        >
          {report?.markdown}
        </pre>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={download} className="max-sm:h-11">
            <Download aria-hidden /> Download .md
          </Button>
          <Button variant="outline" onClick={print} className="max-sm:h-11">
            <Printer aria-hidden /> Print or save as PDF
          </Button>
          <Button onClick={queue} className="max-sm:h-11">
            <Send aria-hidden /> Queue for the ground
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
