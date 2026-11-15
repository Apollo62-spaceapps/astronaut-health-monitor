// Faixa da missão (K4 #44) — DESIGN-SYSTEM §3/§4. A cor vem de --color-banner, que muda com o
// modo de ambiente (data-environment). O botão de modo de ambiente (K5) entra no `envSlot`.
import type { ReactNode } from 'react'
import { ENVIRONMENTS, groundReplySec } from '@/domain/config/environments'
import type { Role } from '@/domain/types'
import { useAppStore } from '@/state/store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const ROLE_LABEL: Record<Role, string> = {
  ASTRONAUT: 'Astronaut',
  CMO: 'CMO',
  FLIGHT_SURGEON: 'Flight Surgeon',
}

/** Divide segundos em horas, minutos e segundos (para "00 HRS 40 MINS 00 SECS"). */
export function splitHms(totalSec: number) {
  const s = Math.round(totalSec)
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}
const pad = (n: number) => String(n).padStart(2, '0')

export function GroundReplyWindow() {
  const environment = useAppStore((st) => st.environment)
  const env = ENVIRONMENTS[environment]
  const total = groundReplySec(environment)
  if (environment === 'EARTH') {
    return <p className="text-sm font-semibold">Flight surgeon available now</p>
  }
  const { h, m, s } = splitHms(total)
  return (
    <div aria-label={`Ground reply window, ${env.label}`} className="flex items-baseline gap-3">
      <span className="text-sm text-white/85">Ground reply window · {env.label}</span>
      {total < 60 ? (
        <span className="num text-2xl font-semibold">
          ~{total.toFixed(1)} <span className="text-xs">SECS</span>
        </span>
      ) : (
        <span className="num flex items-baseline gap-2 text-2xl font-semibold">
          {pad(h)} <span className="text-xs">HRS</span> {pad(m)} <span className="text-xs">MINS</span> {pad(s)}{' '}
          <span className="text-xs">SECS</span>
        </span>
      )}
    </div>
  )
}

export function MissionBanner({ envSlot }: { envSlot?: ReactNode }) {
  const role = useAppStore((s) => s.role)
  const setRole = useAppStore((s) => s.setRole)
  const aiMode = useAppStore((s) => s.aiMode)
  const missionDay = useAppStore((s) => s.missionDay)

  return (
    <div role="region" aria-label="Mission banner" className="bg-banner px-6 py-3 transition-colors">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {envSlot}

        <label className="flex items-center gap-2 text-sm">
          <span className="text-white/85">Role:</span>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger aria-label="Role" className="h-8 w-40 border-white/30 bg-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <span className="rounded bg-black/25 px-2 py-1 text-sm" aria-label="AI mode">
          AI: {aiMode === 'onboard-model' ? 'onboard model' : 'protocol mode'}
        </span>

        <div className="ml-auto">
          <GroundReplyWindow />
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/85">
        Mission day <span className="num">{missionDay}</span> · Simulated
      </p>
    </div>
  )
}
