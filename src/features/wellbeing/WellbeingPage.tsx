import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { History, Info, LockKeyhole, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { useAppStore } from '@/state/store'
import { accessLevel, visibleAuditEntries } from '@/domain/rules/privacy'
import type { WellbeingEntry } from '@/domain/types'
import { formatUtc } from '@/lib/format'
import { ENVIRONMENTS } from '@/domain/config/environments'

const checkInSchema = z.object({ mood: z.number().int().min(1).max(5), sleepHours: z.number().min(0).max(24) })
const MOOD_LABELS = ['Very low', 'Low', 'Neutral', 'Good', 'Very good']
const daysBack = (iso: string, amount: number) =>
  new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - amount * 86_400_000).toISOString().slice(0, 10)

export function WellbeingPage() {
  const role = useAppStore((s) => s.role)
  const environment = useAppStore((s) => s.environment)
  const wellbeing = useAppStore((s) => s.wellbeing)
  const consent = useAppStore((s) => s.consent)
  const breakGlass = useAppStore((s) => s.breakGlass)
  const auditLog = useAppStore((s) => s.auditLog)
  const simNowIso = useAppStore((s) => s.simNowIso)
  const setConsent = useAppStore((s) => s.setConsent)
  const breakGlassAccess = useAppStore((s) => s.breakGlassAccess)
  const endBreakGlass = useAppStore((s) => s.endBreakGlass)
  const loadScenario = useAppStore((s) => s.loadScenario)
  const [mood, setMood] = useState('3')
  const [sleepHours, setSleepHours] = useState('8')
  const [reason, setReason] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [privacyInfoOpen, setPrivacyInfoOpen] = useState(false)
  const privacy = {
    role,
    consentShareWellbeingAlerts: consent.shareWellbeingAlertsWithCmo,
    breakGlassActive: breakGlass.active,
  }
  const canSeeDetails = accessLevel('wellbeingDetail', privacy) === 'full'
  // Log de auditoria por perfil (matriz §6.7): CMO vê só os próprios acessos.
  const auditEntries = visibleAuditEntries(auditLog, privacy).slice().reverse()
  const today = simNowIso.slice(0, 10)
  const environmentEntries = wellbeing.filter((item) => (item.environment ?? 'EARTH') === environment)
  const todayEntry = environmentEntries.find((item) => item.date === today)
  const chartData = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const date = daysBack(simNowIso, 13 - i)
        const entry = environmentEntries.find((item) => item.date === date)
        return { date: formatUtc(`${date}T00:00:00Z`).split(' 20')[0], mood: entry?.mood ?? null, sleep: entry?.sleepHours ?? null }
      }),
    [simNowIso, environmentEntries],
  )
  const chartEntries = chartData.filter((entry) => entry.mood !== null || entry.sleep !== null)
  const notification = auditLog.findLast((entry) => entry.action === 'BREAK_GLASS_VIEW' && entry.actor === 'CMO')

  function saveCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = checkInSchema.safeParse({ mood: Number(mood), sleepHours: Number(sleepHours) })
    if (!parsed.success) {
      setError('Enter a mood from 1 to 5 and sleep from 0 to 24 hours.')
      return
    }
    const entry: WellbeingEntry = {
      date: today,
      environment,
      mood: parsed.data.mood as WellbeingEntry['mood'],
      sleepHours: parsed.data.sleepHours,
    }
    loadScenario({ wellbeing: [...wellbeing.filter((item) => item.date !== today || (item.environment ?? 'EARTH') !== environment), entry] })
    setError('')
  }

  function submitBreakGlass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      breakGlassAccess(reason)
      setDialogOpen(false)
      setReason('')
      setError('')
    } catch {
      setError('A reason is required for emergency access.')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Wellbeing · private</p>
        <h1 className="mt-2 text-3xl">{role === 'ASTRONAUT' ? 'Daily check-in' : 'Crew wellbeing'}</h1>
        <p className="mt-2 text-muted">{ENVIRONMENTS[environment].label} · Self-report, not a clinical assessment.</p>
        {/* PRIV-05: contexto da privacidade, com fonte (S02, S04). */}
        <button
          type="button"
          aria-expanded={privacyInfoOpen}
          aria-controls="privacy-info"
          onClick={() => setPrivacyInfoOpen((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-sm text-link"
        >
          <Info aria-hidden className="size-4" /> Why is this private?
        </button>
        {privacyInfoOpen && (
          <p id="privacy-info" className="mt-2 max-w-3xl rounded-md bg-surface px-4 py-3 text-sm">
            NASA treats private medical communications as private{' '}
            <a href="#/sources?src=S02" className="num">
              [S02]
            </a>
            , and crew medical data are handled under the Privacy Act of 1974{' '}
            <a href="#/sources?src=S04" className="num">
              [S04]
            </a>
            . That is why the CMO sees only the alert level with your consent, or the details through audited emergency
            access.
          </p>
        )}
      </header>
      {role === 'ASTRONAUT' && notification && (
        <p role="status" className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
          CMO accessed your wellbeing data — reason: {notification.reason}
        </p>
      )}
      {role === 'FLIGHT_SURGEON' && notification && (
        <p role="status" className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
          CMO accessed wellbeing data — reason: {notification.reason}
        </p>
      )}

      {role === 'ASTRONAUT' && (
        <Card>
          <CardHeader>
            <CardTitle>Share wellbeing alerts (not details) with CMO</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="max-w-2xl text-sm text-muted">
              This shares only the alert level. Your mood and sleep entries remain private.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">{consent.shareWellbeingAlertsWithCmo ? 'On' : 'Off'}</span>
              <Switch
                className="data-[state=checked]:bg-link"
                checked={consent.shareWellbeingAlertsWithCmo}
                onCheckedChange={setConsent}
                aria-label="Share wellbeing alerts (not details) with CMO"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {!canSeeDetails ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole aria-hidden className="size-5" />
              Restricted — private medical data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted">Mood and sleep entries are private. Emergency access is audited.</p>
            {role === 'CMO' && !breakGlass.active && (
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                Emergency access
              </Button>
            )}
            {breakGlass.active && (
              <Button variant="outline" onClick={endBreakGlass}>
                End emergency access
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
            {role === 'ASTRONAUT' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Today&apos;s check-in {todayEntry && <span className="text-sm font-normal text-muted">· saved</span>}
                    <ProvenanceBadge
                      provenance={{ kind: 'simulated', note: 'Self-reported check-in in this demo scenario.' }}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={saveCheckIn} className="space-y-4">
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium">How would you describe your mood?</legend>
                      <div className="grid grid-cols-5 gap-2">
                        {MOOD_LABELS.map((label, index) => (
                          <label
                            key={label}
                            className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-border px-1 py-2 text-center text-xs whitespace-nowrap has-[:checked]:border-link has-[:checked]:bg-surface-2"
                          >
                            <input
                              type="radio"
                              name="mood"
                              value={index + 1}
                              checked={mood === String(index + 1)}
                              onChange={(e) => setMood(e.target.value)}
                              className="accent-link"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="space-y-2">
                      <Label htmlFor="sleep-hours">Hours of sleep</Label>
                      <Input
                        id="sleep-hours"
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    {error && (
                      <p role="alert" className="text-sm text-muted">
                        {error}
                      </p>
                    )}
                    <Button type="submit" variant="secondary">
                      {todayEntry ? 'Update check-in' : 'Save check-in'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
            <Card className={role !== 'ASTRONAUT' ? 'col-span-2' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Last 14 days
                  <ProvenanceBadge provenance={{ kind: 'simulated', note: 'Self-reported mood and sleep.' }} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Legenda: cada eixo tem a cor da sua série (humor à esquerda, sono à direita). */}
                <ul aria-label="Chart legend" className="mb-3 flex flex-wrap gap-4 text-sm">
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="inline-block h-0.5 w-5 bg-link" />
                    Mood (1–5, left axis)
                  </li>
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="inline-block h-3 w-1.5 bg-muted/60" />
                    Sleep (hours, right axis)
                  </li>
                </ul>
                <div
                  className="h-72"
                  role="img"
                  aria-label="Chart of self-reported mood and sleep over the last 14 days"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="var(--color-muted)"
                        tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                        interval={1}
                      />
                      <YAxis
                        yAxisId="mood"
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        allowDecimals={false}
                        width={28}
                        stroke="var(--color-link)"
                        tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      />
                      <YAxis
                        yAxisId="sleep"
                        orientation="right"
                        domain={[0, 12]}
                        ticks={[0, 3, 6, 9, 12]}
                        width={32}
                        stroke="var(--color-muted)"
                        tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      />
                      <Bar
                        yAxisId="sleep"
                        dataKey="sleep"
                        name="Sleep (hours)"
                        barSize={6}
                        fill="var(--color-muted)"
                        fillOpacity={0.55}
                        isAnimationActive={false}
                      />
                      {/* Humor é ordinal (1–5): degraus com pontos, sem curva que passa do valor real. */}
                      <Line
                        yAxisId="mood"
                        type="stepAfter"
                        dataKey="mood"
                        name="Mood (1–5)"
                        stroke="var(--color-link)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: 'var(--color-link)' }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {chartEntries.length === 0 && (
                  <p className="text-sm text-muted">No check-ins recorded in this 14-day window yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
          {breakGlass.active && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert aria-hidden className="size-5" />
                  Emergency access active
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted">Access is being recorded. Reason: {breakGlass.reason}</p>
                <Button variant="outline" onClick={endBreakGlass}>
                  End emergency access
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History aria-hidden className="size-5" />
            Audit log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {role === 'CMO' && <p className="mb-3 text-xs text-muted">Showing your own access entries only.</p>}
          {auditEntries.length === 0 ? (
            <p className="text-sm text-muted">No access or consent changes recorded yet.</p>
          ) : (
            <ol className="divide-y divide-border text-sm" aria-label="Audit log entries">
              {auditEntries.map((entry) => (
                <li
                  key={`${entry.at}-${entry.action}-${entry.actor}`}
                  className="grid grid-cols-[210px_140px_1fr] gap-3 py-2"
                >
                  <span className="num text-muted">{formatUtc(entry.at)}</span>
                  <span>
                    {entry.actor === 'FLIGHT_SURGEON' ? 'Flight surgeon' : entry.actor === 'CMO' ? 'CMO' : 'Astronaut'}
                  </span>
                  <span>
                    {entry.action === 'BREAK_GLASS_VIEW' ? 'Emergency access to wellbeing' : 'Consent changed'}
                    {entry.reason ? ` — reason: ${entry.reason}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-xs text-muted">Simulated mission clock · demo.</p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={submitBreakGlass}>
            <DialogHeader>
              <DialogTitle>Emergency access</DialogTitle>
              <DialogDescription>
                Viewing private wellbeing data will be recorded in the audit log and the astronaut will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="break-glass-reason">Reason</Label>
              <Input
                id="break-glass-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                autoFocus
              />
              {error && (
                <p role="alert" className="text-sm text-muted">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!reason.trim()}>
                Confirm access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
