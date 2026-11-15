import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { INPUT_PLAUSIBILITY } from '@/domain/config/thresholds'
import type { RoutineItem, VitalKind, VitalReading } from '@/domain/types'

const measurementSchema = z.object({
  kind: z.enum(['heartRate', 'systolicBP', 'diastolicBP', 'glucose', 'bodyTemp']),
  value: z.number().finite(),
}).superRefine(({ kind, value }, ctx) => {
  const bounds = INPUT_PLAUSIBILITY[kind]
  if (value < bounds.min || value > bounds.max) ctx.addIssue({ code: 'custom', message: `Enter a value from ${bounds.min} to ${bounds.max}.`, path: ['value'] })
})

const KIND_LABEL: Record<VitalKind, string> = {
  heartRate: 'Resting heart rate (bpm)', systolicBP: 'Systolic blood pressure (mmHg)',
  diastolicBP: 'Diastolic blood pressure (mmHg)', glucose: 'Blood glucose (mg/dL)', bodyTemp: 'Body temperature (°C)',
}

export function MeasurementDialog({ item, open, onOpenChange, onSave, nowIso }: {
  item: RoutineItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (item: RoutineItem, reading: VitalReading) => void
  nowIso: string
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const kind = item?.vital ?? 'heartRate'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = measurementSchema.safeParse({ kind, value: Number(value) })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Enter a valid measurement.'); return }
    const unit = kind === 'heartRate' ? 'bpm' : kind === 'bodyTemp' ? '°C' : kind === 'glucose' ? 'mg/dL' : 'mmHg'
    onSave(item!, { kind, value: parsed.data.value, unit, takenAt: nowIso, provenance: { kind: 'simulated', note: 'Demo measurement' } })
    setValue(''); setError(''); onOpenChange(false)
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto max-sm:p-4">
      <form onSubmit={submit}>
        <DialogHeader><DialogTitle>Log measurement</DialogTitle><DialogDescription>{item?.title ?? 'Record a mission measurement.'} · Illustrative thresholds</DialogDescription></DialogHeader>
        <div className="space-y-2 py-5"><Label htmlFor="measurement-value">{KIND_LABEL[kind]}</Label>
          <Input id="measurement-value" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!error} className="max-sm:h-11" autoFocus />
          {error && <p role="alert" className="text-sm text-muted">{error}</p>}
          <p className="text-xs text-muted">Input plausibility check only; this is not a clinical threshold.</p>
        </div>
        <DialogFooter><Button type="submit" className="max-sm:h-11 max-sm:w-full">Save measurement</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
