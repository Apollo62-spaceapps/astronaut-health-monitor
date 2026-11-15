// Mapa do corpo (BODY-01, BODY-04, BODY-06): SVG com um <g data-zone> por zona.
// O status vem das regras (R-BODY-01 via engine) e só troca o atributo data-status.
// Acessibilidade: cor + ícone + texto, hachura em todo status não normal, zonas focáveis (Enter/Espaço) e aria-label.
import type { KeyboardEvent, ReactNode } from 'react'
import { Lock } from 'lucide-react'
import type { BodyZoneId, ZoneStatus } from '@/domain/types'
import { STATUS_META } from '@/components/StatusBadge'

export type MapTarget = BodyZoneId | 'radiation'

const COLOR: Record<ZoneStatus, string> = {
  normal: 'var(--color-normal)',
  attention: 'var(--color-attention)',
  urgent: 'var(--color-urgent)',
  restricted: 'var(--color-muted)',
  adapting: 'var(--color-muted)',
}
const NO_DATA = 'var(--color-muted)'

export function statusText(status: ZoneStatus | null): string {
  return status ? STATUS_META[status].label : 'No data'
}
const glyph = (status: ZoneStatus | null) => (status ? STATUS_META[status].glyph : '–')

export interface BodyMapProps {
  status: Record<BodyZoneId, ZoneStatus | null>
  /** Texto extra do aria-label, ex.: "resting heart rate +18% vs baseline". */
  detail: Partial<Record<MapTarget, string>>
  labels: Record<BodyZoneId, string>
  radiation: { status: ZoneStatus | null; label: string }
  selected: MapTarget | null
  onSelect: (target: MapTarget) => void
  /** Zona Legs é P1 (L5): sem ela, as pernas aparecem só como contorno neutro. */
  showLegs?: boolean
  /** Classe extra por status (ex.: animação do Urgent, L5). */
  pulse?: boolean
}

function Zone({
  id,
  status,
  label,
  detail,
  selected,
  onSelect,
  children,
  pulse,
}: {
  id: MapTarget
  status: ZoneStatus | null
  label: string
  detail?: string
  selected: boolean
  onSelect: (t: MapTarget) => void
  children: ReactNode
  pulse?: boolean
}) {
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(id)
    }
  }
  return (
    <g
      data-zone={id}
      data-status={status ?? 'none'}
      data-selected={selected || undefined}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={[label, statusText(status), detail].filter(Boolean).join(' — ')}
      onClick={() => onSelect(id)}
      onKeyDown={onKey}
      className={`zone group cursor-pointer outline-none ${pulse && status === 'urgent' ? 'zone-pulse' : ''}`}
      style={{ color: status ? COLOR[status] : NO_DATA }}
    >
      {children}
    </g>
  )
}

/** Preenchimento: hachura em todo status que não é Normal (BODY-04). */
const fillFor = (status: ZoneStatus | null) =>
  status === null ? 'transparent' : status === 'normal' ? 'currentColor' : `url(#hatch-${status})`
const fillOpacity = (status: ZoneStatus | null) => (status === 'normal' ? 0.18 : 1)
const shapeClass = (selected: boolean) =>
  `transition-[stroke-width] group-hover:[stroke-width:4] group-focus-visible:[stroke-width:5] ${selected ? '[stroke-width:4]' : ''}`

function Label({
  x,
  y,
  status,
  text,
  anchor = 'start',
}: {
  x: number
  y: number
  status: ZoneStatus | null
  text: string
  anchor?: 'start' | 'end'
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="fill-current text-[17px] font-semibold" aria-hidden>
      {glyph(status)} {text} · {statusText(status)}
    </text>
  )
}

export function BodyMap({
  status,
  detail,
  labels,
  radiation,
  selected,
  onSelect,
  showLegs = false,
  pulse,
}: BodyMapProps) {
  const z = (id: BodyZoneId) => ({
    id,
    status: status[id],
    label: labels[id],
    detail: detail[id],
    selected: selected === id,
    onSelect,
    pulse,
  })
  const statuses: ZoneStatus[] = ['attention', 'urgent', 'restricted', 'adapting']

  return (
    <svg viewBox="-60 0 560 470" className="h-auto w-full max-w-[560px]" role="group" aria-label="Body status map">
      {/* BODY-05: Urgent pulsa a 1,25 Hz (abaixo de ~1,5 Hz e do limite de 3/s da WCAG 2.3.1); Attention estático;
          nada se mexe com prefers-reduced-motion. */}
      <style>{`
        @keyframes zone-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
        .zone-pulse > :first-child { animation: zone-pulse 0.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .zone-pulse > :first-child { animation: none; } }
      `}</style>
      <defs>
        {statuses.map((s) => (
          <pattern
            key={s}
            id={`hatch-${s}`}
            patternUnits="userSpaceOnUse"
            width="7"
            height="7"
            patternTransform="rotate(45)"
          >
            <rect width="7" height="7" fill={COLOR[s]} fillOpacity={0.15} />
            <line x1="0" y1="0" x2="0" y2="7" stroke={COLOR[s]} strokeWidth="3" strokeOpacity={0.55} />
          </pattern>
        ))}
      </defs>

      {/* Overlay de radiação: corpo inteiro, não é zona (§6.1.1) */}
      <Zone
        id="radiation"
        status={radiation.status}
        label="Radiation (whole body)"
        detail={detail.radiation}
        selected={selected === 'radiation'}
        onSelect={onSelect}
        pulse={pulse}
      >
        <ellipse
          cx="220"
          cy="240"
          rx="172"
          ry="222"
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.7}
          strokeWidth="2"
          strokeDasharray="3 7"
          className={shapeClass(selected === 'radiation')}
        />
        <ellipse cx="220" cy="240" rx="172" ry="222" fill="none" stroke="transparent" strokeWidth="14" />
        <text x="-50" y="22" className="fill-current text-[17px] font-semibold" aria-hidden>
          {glyph(radiation.status)} {radiation.label}
        </text>
      </Zone>

      {/* Skin / body: contorno do corpo */}
      <Zone {...z('skin')}>
        <rect
          x="140"
          y="96"
          width="160"
          height="336"
          rx="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={status.skin === 'normal' ? undefined : '10 5'}
          className={shapeClass(selected === 'skin')}
        />
        <rect x="140" y="96" width="160" height="336" rx="44" fill="none" stroke="transparent" strokeWidth="14" />
        <Label x={132} y={420} anchor="end" status={status.skin} text={labels.skin} />
      </Zone>

      {/* Legs (P1) */}
      {showLegs ? (
        <Zone {...z('legs')}>
          <rect
            x="176"
            y="248"
            width="38"
            height="170"
            rx="18"
            fill={fillFor(status.legs)}
            fillOpacity={fillOpacity(status.legs)}
            stroke="currentColor"
            strokeWidth="2.5"
            className={shapeClass(selected === 'legs')}
          />
          <rect
            x="226"
            y="248"
            width="38"
            height="170"
            rx="18"
            fill={fillFor(status.legs)}
            fillOpacity={fillOpacity(status.legs)}
            stroke="currentColor"
            strokeWidth="2.5"
            className={shapeClass(selected === 'legs')}
          />
          <Label x={312} y={340} status={status.legs} text={labels.legs} />
        </Zone>
      ) : (
        <g aria-hidden style={{ color: NO_DATA }}>
          <rect
            x="176"
            y="248"
            width="38"
            height="170"
            rx="18"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth="2"
          />
          <rect
            x="226"
            y="248"
            width="38"
            height="170"
            rx="18"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth="2"
          />
        </g>
      )}

      {/* Torso / metabolic */}
      <Zone {...z('torso')}>
        <rect
          x="166"
          y="108"
          width="108"
          height="132"
          rx="30"
          fill={fillFor(status.torso)}
          fillOpacity={fillOpacity(status.torso)}
          stroke="currentColor"
          strokeWidth="2.5"
          className={shapeClass(selected === 'torso')}
        />
        <Label x={132} y={200} anchor="end" status={status.torso} text={labels.torso} />
      </Zone>

      {/* Heart (por cima do torso) */}
      <Zone {...z('heart')}>
        <circle
          cx="236"
          cy="146"
          r="17"
          fill={fillFor(status.heart)}
          fillOpacity={status.heart === 'normal' ? 0.5 : 1}
          stroke="currentColor"
          strokeWidth="2.5"
          className={shapeClass(selected === 'heart')}
        />
        <Label x={312} y={151} status={status.heart} text={labels.heart} />
      </Zone>

      {/* Head (restrita para o CMO: cinza + cadeado, BODY-06) */}
      <Zone {...z('head')}>
        <circle
          cx="220"
          cy="56"
          r="34"
          fill={fillFor(status.head)}
          fillOpacity={fillOpacity(status.head)}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={status.head === 'restricted' ? '5 5' : undefined}
          className={shapeClass(selected === 'head')}
        />
        {status.head === 'restricted' && <Lock x={208} y={44} width={24} height={24} aria-hidden />}
        <Label x={266} y={61} status={status.head} text={labels.head} />
      </Zone>
    </svg>
  )
}
