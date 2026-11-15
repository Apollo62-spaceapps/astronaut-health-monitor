// Mapa do corpo (BODY-01, BODY-04, BODY-06): SVG com um <g data-zone> por zona.
// O status vem das regras (R-BODY-01 via engine) e só troca o atributo data-status.
// Acessibilidade: cor + ícone + texto, hachura em todo status não normal, zonas focáveis (Enter/Espaço) e aria-label.
// Animação (opção A · Heartbeat pulse): ícone do coração + anel de pulso seguem o batimento; tronco respira devagar.
// O ritmo é ilustrativo, não uma leitura ao vivo.
import type { KeyboardEvent, ReactNode } from 'react'
import { HeartPulse, Lock } from 'lucide-react'
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

/** Rótulo ao lado do corpo, com subtítulo opcional. */
function Label({
  x,
  y,
  status,
  text,
  anchor = 'start',
  sub,
}: {
  x: number
  y: number
  status: ZoneStatus | null
  text: string
  anchor?: 'start' | 'end'
  sub?: string
}) {
  return (
    <g aria-hidden>
      <text x={x} y={y} textAnchor={anchor} className="fill-current text-[17px] font-semibold">
        {glyph(status)} {text} · {statusText(status)}
      </text>
      {sub && (
        <text x={x} y={y + 18} textAnchor={anchor} className="fill-muted text-[12px]">
          {sub}
        </text>
      )}
    </g>
  )
}

/** Linha-guia visível + faixa larga transparente para facilitar o clique. */
function Leader({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={0.8} strokeWidth="1.5" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="14" />
    </>
  )
}

const LEGEND: { status: ZoneStatus; x: number; y: number }[] = [
  { status: 'normal', x: 508, y: 476 },
  { status: 'attention', x: 568, y: 476 },
  { status: 'urgent', x: 650, y: 476 },
  { status: 'restricted', x: 508, y: 496 },
  { status: 'adapting', x: 592, y: 496 },
]

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
  const HX = 366
  const HY = 172
  const skinDash = status.skin === 'normal' ? undefined : '10 5'

  return (
    <>
      <svg viewBox="-40 0 760 520" className="h-auto w-full max-w-[760px]" role="group" aria-label="Body status map">
        {/* BODY-05: Urgent pulsa a 1,25 Hz (abaixo do limite de 3/s da WCAG 2.3.1); Attention estático.
            Batimento (~0,8 Hz) e respiração do tronco (lenta) são ilustrativos.
            Nada se mexe com prefers-reduced-motion. */}
        <style>{`
          @keyframes zone-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
          @keyframes heart-beat { 0%, 56%, 100% { transform: scale(1) } 14% { transform: scale(1.18) } 42% { transform: scale(1.1) } 28% { transform: scale(1) } }
          @keyframes heart-ring { 0% { transform: scale(0.85); opacity: 0.65 } 60%, 100% { transform: scale(1.55); opacity: 0 } }
          @keyframes torso-breathe { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.035) } }
          .zone-pulse > :first-child { animation: zone-pulse 0.8s ease-in-out infinite; }
          .heart-beat, .heart-ring, .torso-breathe { transform-box: fill-box; transform-origin: center; }
          .heart-beat { animation: heart-beat 1.2s ease-in-out infinite; }
          .heart-ring { animation: heart-ring 1.2s ease-out infinite; }
          .torso-breathe { animation: torso-breathe 5s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .zone-pulse > :first-child, .heart-beat, .heart-ring, .torso-breathe { animation: none; }
            .heart-ring { opacity: 0; }
          }
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

        {/* Pescoço (decorativo) */}
        <rect
          x="346"
          y="96"
          width="28"
          height="26"
          rx="8"
          fill="none"
          stroke={NO_DATA}
          strokeOpacity={0.45}
          strokeWidth="2"
          aria-hidden
        />

        {/* Radiação: corpo inteiro, não é zona (§6.1.1) — só rótulo + linha-guia */}
        <Zone
          id="radiation"
          status={radiation.status}
          label="Radiation (whole body)"
          detail={detail.radiation}
          selected={selected === 'radiation'}
          onSelect={onSelect}
          pulse={pulse}
        >
          <Leader x1={258} y1={106} x2={322} y2={106} />
          <text x={250} y={112} textAnchor="end" className="fill-current text-[17px] font-semibold" aria-hidden>
            {glyph(radiation.status)} {radiation.label}
          </text>
        </Zone>

        {/* Skin: silhueta do corpo (tronco + braços) */}
        <Zone {...z('skin')}>
          <rect
            x="296"
            y="116"
            width="128"
            height="178"
            rx="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={skinDash}
            className={shapeClass(selected === 'skin')}
          />
          <rect
            x="268"
            y="128"
            width="26"
            height="116"
            rx="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={skinDash}
            className={shapeClass(selected === 'skin')}
          />
          <rect
            x="426"
            y="128"
            width="26"
            height="116"
            rx="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={skinDash}
            className={shapeClass(selected === 'skin')}
          />
          <Leader x1={258} y1={306} x2={300} y2={290} />
          <Label x={250} y={312} anchor="end" status={status.skin} text={labels.skin} />
        </Zone>

        {/* Legs (P1) */}
        {showLegs ? (
          <Zone {...z('legs')}>
            {[318, 368].map((x) => (
              <rect
                key={x}
                x={x}
                y="290"
                width="34"
                height="180"
                rx="17"
                fill={fillFor(status.legs)}
                fillOpacity={fillOpacity(status.legs)}
                stroke="currentColor"
                strokeWidth="2.5"
                className={shapeClass(selected === 'legs')}
              />
            ))}
            <Leader x1={404} y1={396} x2={462} y2={396} />
            <Label
              x={470}
              y={402}
              status={status.legs}
              text={labels.legs}
              sub={detail.legs ? `${detail.legs} · SIMULATED` : undefined}
            />
          </Zone>
        ) : (
          <g aria-hidden style={{ color: NO_DATA }}>
            {[318, 368].map((x) => (
              <rect
                key={x}
                x={x}
                y="290"
                width="34"
                height="180"
                rx="17"
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.45}
                strokeWidth="2"
              />
            ))}
          </g>
        )}

        {/* Torso / metabolic: respira devagar */}
        <Zone {...z('torso')}>
          <rect
            x="324"
            y="134"
            width="72"
            height="120"
            rx="26"
            fill={fillFor(status.torso)}
            fillOpacity={fillOpacity(status.torso)}
            stroke="currentColor"
            strokeWidth="2.5"
            className={`torso-breathe ${shapeClass(selected === 'torso')}`}
          />
          <Leader x1={258} y1={198} x2={322} y2={198} />
          <Label x={250} y={204} anchor="end" status={status.torso} text={labels.torso} />
        </Zone>

        {/* Heart (por cima do torso): ícone bate, anel de pulso se expande */}
        <Zone {...z('heart')}>
          <circle
            cx={HX}
            cy={HY}
            r="19"
            fill={fillFor(status.heart)}
            fillOpacity={status.heart === 'normal' ? 0.18 : 1}
            stroke="currentColor"
            strokeOpacity={0}
            strokeWidth="2.5"
            className={shapeClass(selected === 'heart')}
          />
          <circle cx={HX} cy={HY} r="32" fill="none" stroke={NO_DATA} strokeOpacity={0.5} strokeWidth="3" />
          <circle
            cx={HX}
            cy={HY}
            r="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="heart-ring"
            aria-hidden
          />
          {/* Colchetes de foco */}
          <path
            d={`M${HX - 24} ${HY - 14} v-10 h10 M${HX + 24} ${HY - 14} v-10 h-10 M${HX - 24} ${HY + 14} v10 h10 M${HX + 24} ${HY + 14} v10 h-10`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          />
          <g className="heart-beat" aria-hidden>
            <HeartPulse x={HX - 14} y={HY - 14} width={28} height={28} strokeWidth={2.2} />
          </g>
          <Leader x1={398} y1={HY} x2={462} y2={HY} />
          <Label
            x={470}
            y={HY + 6}
            status={status.heart}
            text={labels.heart}
            sub={detail.heart ? `${detail.heart} · SIMULATED` : undefined}
          />
        </Zone>

        {/* Head (restrita para o CMO: cinza + cadeado, BODY-06) */}
        <Zone {...z('head')}>
          <ellipse
            cx="360"
            cy="58"
            rx="32"
            ry="38"
            fill={fillFor(status.head)}
            fillOpacity={fillOpacity(status.head)}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={status.head === 'restricted' ? '5 5' : undefined}
            className={shapeClass(selected === 'head')}
          />
          {status.head === 'restricted' && <Lock x={348} y={46} width={24} height={24} aria-hidden />}
          <Leader x1={394} y1={58} x2={462} y2={58} />
          <Label x={470} y={64} status={status.head} text={labels.head} />
        </Zone>

        {/* Legenda de status (decorativa; ícone + texto, nunca só cor) */}
        <g aria-hidden>
          <rect
            x="496"
            y="430"
            width="212"
            height="78"
            rx="10"
            fill="#000"
            fillOpacity={0.6}
            stroke={NO_DATA}
            strokeOpacity={0.5}
          />
          <text x="508" y="452" className="fill-muted font-mono text-[10px]" letterSpacing="1.5">
            STATUS KEY
          </text>
          {LEGEND.map(({ status: s, x, y }) => (
            <text key={s} x={x} y={y} className="text-[12px] font-semibold" fill={COLOR[s]}>
              {STATUS_META[s].glyph} {STATUS_META[s].label}
            </text>
          ))}
        </g>
      </svg>
      <div className="flex w-full max-w-[760px] items-center justify-between gap-3 text-xs text-muted">
        <span>Illustrative rhythm, not a live reading · torso breathes slowly · icon, text and hatch always present</span>
        <span className="num shrink-0 rounded bg-muted/20 px-2 py-0.5 font-semibold tracking-wider">SIMULATED</span>
      </div>
    </>
  )
}
