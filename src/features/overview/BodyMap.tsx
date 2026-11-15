// Mapa do corpo (BODY-01, BODY-04, BODY-06): SVG com um <g data-zone> por zona.
// O status vem das regras (R-BODY-01 via engine) e só troca o atributo data-status.
// Acessibilidade: cor + ícone + texto, hachura em todo status não normal, zonas focáveis (Enter/Espaço) e aria-label.
// Animação (Heartbeat pulse): ícone do coração + anel de pulso em dois tempos; tronco respira devagar.
// O ritmo é ilustrativo, não uma leitura ao vivo. Tudo para com prefers-reduced-motion.
// Figura: astronauta (capacete, ombreiras, braços com luvas, placa do peito, cinto, joelheiras e botas), sem brilho
// (DESIGN-SYSTEM v2 §1/§8). Tamanhos: viewBox de 660 de largura num mapa de ~560–620 px na tela, então
// 18 unidades ≈ 15 px reais (mínimo de 12 px renderizados). A legenda de status fica em HTML, abaixo do SVG.
import type { KeyboardEvent, ReactNode } from 'react'
import { HeartPulse, Lock } from 'lucide-react'
import type { BodyZoneId, ZoneStatus } from '@/domain/types'
import { STATUS_META } from '@/components/StatusBadge'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'

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
  /** Sublinha curta visível sob o rótulo (ex.: "+18% vs baseline"). */
  sub?: Partial<Record<MapTarget, string>>
  labels: Record<BodyZoneId, string>
  /** Overlay de radiação. `label` já vem pronto (ex.: "Radiation · Urgent — shelter"). */
  radiation: { status: ZoneStatus | null; label: string }
  selected: MapTarget | null
  onSelect: (target: MapTarget) => void
  /** Zona Legs é P1 (L5): sem ela, as pernas aparecem só como contorno neutro. */
  showLegs?: boolean
  /** Liga a animação de pulso do Urgent (BODY-05). */
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

/** Rótulo ao lado do corpo, com sublinha opcional. */
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
      <text x={x} y={y} textAnchor={anchor} className="fill-current text-[18px] font-semibold">
        {glyph(status)} {text} · {statusText(status)}
      </text>
      {sub && (
        <text x={x} y={y + 20} textAnchor={anchor} className="fill-muted font-mono text-[15px]">
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

// Geometria do astronauta (centro do corpo em X = 330). viewBox 660 × 610; o mapa ocupa ~560–620 px na tela.
const CX = 330
const HX = CX // coração no centro da placa do peito
const HY = 208
const LEFT_TEXT = 186 // rótulos à esquerda terminam aqui
const RIGHT_TEXT = 474 // rótulos à direita começam aqui
/** Espelho horizontal em torno do centro: o lado direito é o esquerdo refletido. */
const MIRROR = `matrix(-1 0 0 1 ${2 * CX} 0)`

/** Peças do braço esquerdo (placas chanfradas, como na arte): ombreira, braço, antebraço e luva com polegar. */
const ARM_PARTS = [
  `M${CX - 74} 142 L${CX - 104} 136 Q${CX - 130} 140 ${CX - 130} 166 L${CX - 126} 188 L${CX - 92} 192 L${CX - 80} 160 Z`,
  `M${CX - 130} 198 L${CX - 90} 198 L${CX - 93} 266 L${CX - 127} 266 Z`,
  `M${CX - 132} 272 L${CX - 93} 272 L${CX - 96} 336 L${CX - 129} 336 Z`,
  `M${CX - 134} 342 H${CX - 95} V366 Q${CX - 95} 390 ${CX - 114} 390 Q${CX - 134} 390 ${CX - 134} 366 Z`,
] as const
const THUMB = `M${CX - 95} 348 Q${CX - 83} 350 ${CX - 84} 362 Q${CX - 85} 371 ${CX - 95} 371`
/** Peças da perna esquerda: coxa, joelheira, canela e bota com bico para fora. */
const LEG_PARTS = [
  `M${CX - 62} 330 H${CX - 8} L${CX - 12} 420 H${CX - 56} Z`,
  `M${CX - 54} 437 Q${CX - 54} 424 ${CX - 41} 424 H${CX - 27} Q${CX - 14} 424 ${CX - 14} 437 Q${CX - 14} 450 ${CX - 27} 450 H${CX - 41} Q${CX - 54} 450 ${CX - 54} 437 Z`,
  `M${CX - 56} 454 H${CX - 12} L${CX - 14} 526 H${CX - 54} Z`,
  `M${CX - 58} 530 H${CX - 12} V552 Q${CX - 12} 562 ${CX - 22} 562 H${CX - 68} Q${CX - 76} 562 ${CX - 76} 554 Q${CX - 76} 540 ${CX - 58} 536 Z`,
] as const
/** Filetes de detalhe (como na arte): linhas curtas dentro das peças, na cor da zona. */
const ARM_STRIPES = [
  { x: CX - 110, y1: 210, y2: 254 },
  { x: CX - 112, y1: 284, y2: 324 },
] as const
const LEG_STRIPES = [
  { x: CX - 34, y1: 344, y2: 404 },
  { x: CX - 34, y1: 468, y2: 512 },
] as const

const TORSO_SHELL = `M${CX - 62} 140 H${CX + 62} L${CX + 78} 160 V250 L${CX + 60} 284 H${CX - 60} L${CX - 78} 250 V160 Z`
const CHEST_PLATE = `M${CX - 48} 160 H${CX + 48} L${CX + 58} 172 V238 L${CX + 44} 260 H${CX - 44} L${CX - 58} 238 V172 Z`
const BUCKLE = `M${CX - 26} 308 H${CX + 26} L${CX + 18} 324 H${CX - 18} Z`

export function BodyMap({
  status,
  detail,
  sub = {},
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
  const skinDash = status.skin === 'normal' ? undefined : '10 5'
  const radUrgent = radiation.status === 'urgent'

  /**
   * Um membro: o lado esquerdo e o mesmo desenho espelhado. Cada peça leva o preenchimento do status
   * (hachura fora do Normal, BODY-04); os filetes e o polegar são detalhe na cor da zona.
   * `neutral` desenha só o contorno cinza (zona ainda não ativa).
   */
  const limb = (
    parts: readonly string[],
    stripes: readonly { x: number; y1: number; y2: number }[],
    st: ZoneStatus | null,
    isSelected: boolean,
    extra?: string,
    neutral = false,
  ) => {
    const side = (
      <>
        {parts.map((d) => (
          <path
            key={d}
            d={d}
            fill={neutral ? 'none' : fillFor(st)}
            fillOpacity={neutral ? undefined : fillOpacity(st)}
            stroke="currentColor"
            strokeOpacity={neutral ? 0.45 : undefined}
            strokeWidth={neutral ? 2 : 2.5}
            strokeLinejoin="round"
            className={neutral ? undefined : shapeClass(isSelected)}
          />
        ))}
        {extra && (
          <path d={extra} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden />
        )}
        {!neutral &&
          stripes.map((s) => (
            <line
              key={`${s.x}-${s.y1}`}
              x1={s.x}
              y1={s.y1}
              x2={s.x}
              y2={s.y2}
              stroke="currentColor"
              strokeOpacity={0.55}
              strokeWidth="3"
              strokeLinecap="round"
              aria-hidden
            />
          ))}
      </>
    )
    return (
      <>
        <g>{side}</g>
        <g transform={MIRROR}>{side}</g>
      </>
    )
  }

  return (
    <>
      <svg viewBox="0 0 660 610" className="h-auto w-full max-w-[620px]" role="group" aria-label="Body status map">
        {/* BODY-05: Urgent pulsa a 1,25 Hz (abaixo do limite de 3/s da WCAG 2.3.1); Attention estático.
            Batimento em dois tempos (~0,8 Hz) e respiração da placa do peito são ilustrativos.
            Nada se mexe com prefers-reduced-motion. */}
        <style>{`
          @keyframes zone-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }
          @keyframes heart-beat { 0%, 56%, 100% { transform: scale(1) } 14% { transform: scale(1.18) } 28% { transform: scale(1) } 42% { transform: scale(1.1) } }
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

        {/* Radiação: overlay do corpo inteiro, não é zona (§6.1.1). O anel tracejado é o 1º filho (pulsa no Urgent). */}
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
            cx={CX}
            cy="296"
            rx="190"
            ry="278"
            fill="none"
            stroke="currentColor"
            strokeOpacity={radUrgent ? 1 : 0.45}
            strokeWidth={radUrgent ? 3 : 2}
            strokeDasharray="4 8"
            className={shapeClass(selected === 'radiation')}
          />
          <ellipse cx={CX} cy="296" rx="190" ry="278" fill="none" stroke="transparent" strokeWidth="14" />
          <Leader x1={12} y1={584} x2={232} y2={548} />
          <text x={8} y={604} className="fill-current text-[18px] font-semibold" aria-hidden>
            {radiation.status ? `${glyph(radiation.status)} ` : ''}
            {radiation.label}
          </text>
        </Zone>

        {/* Anel do pescoço (decorativo) */}
        <rect
          x={CX - 30}
          y="120"
          width="60"
          height="16"
          rx="6"
          fill="none"
          stroke={NO_DATA}
          strokeOpacity={0.5}
          strokeWidth="2"
          aria-hidden
        />

        {/* Skin: casca do traje (tronco) + cinto */}
        <Zone {...z('skin')}>
          <path
            d={TORSO_SHELL}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray={skinDash}
            className={shapeClass(selected === 'skin')}
          />
          <rect
            x={CX - 66}
            y="290"
            width="132"
            height="18"
            rx="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={skinDash}
            className={shapeClass(selected === 'skin')}
          />
          <path d={BUCKLE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden />
          <Leader x1={LEFT_TEXT + 6} y1={299} x2={CX - 66} y2={299} />
          <Label x={LEFT_TEXT} y={305} anchor="end" status={status.skin} text={labels.skin} sub={sub.skin} />
        </Zone>

        {/* Legs (P1): coxas, joelheiras, canelas e botas */}
        {showLegs ? (
          <Zone {...z('legs')}>
            {limb(LEG_PARTS, LEG_STRIPES, status.legs, selected === 'legs')}
            <Leader x1={CX + 58} y1={470} x2={RIGHT_TEXT - 6} y2={470} />
            <Label x={RIGHT_TEXT} y={476} status={status.legs} text={labels.legs} sub={sub.legs} />
          </Zone>
        ) : (
          <g aria-hidden style={{ color: NO_DATA }}>
            {limb(LEG_PARTS, LEG_STRIPES, null, false, undefined, true)}
          </g>
        )}

        {/* Torso / metabolic: placa do peito, respira devagar */}
        <Zone {...z('torso')}>
          <path
            d={CHEST_PLATE}
            fill={fillFor(status.torso)}
            fillOpacity={fillOpacity(status.torso)}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className={`torso-breathe ${shapeClass(selected === 'torso')}`}
          />
          <Leader x1={LEFT_TEXT + 6} y1={232} x2={CX - 58} y2={232} />
          <Label x={LEFT_TEXT} y={238} anchor="end" status={status.torso} text={labels.torso} sub={sub.torso} />
        </Zone>

        {/* Arms: ombreiras, braços, antebraços e luvas (musculoesquelético, mesmo indicador de Legs) */}
        <Zone {...z('arms')}>
          {limb(ARM_PARTS, ARM_STRIPES, status.arms, selected === 'arms', THUMB)}
          <Leader x1={LEFT_TEXT + 6} y1={162} x2={CX - 130} y2={162} />
          <Label x={LEFT_TEXT} y={168} anchor="end" status={status.arms} text={labels.arms} sub={sub.arms} />
        </Zone>

        {/* Heart (sobre a placa do peito): ícone bate em dois tempos, anel de pulso se expande */}
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
          <Leader x1={HX + 34} y1={HY} x2={RIGHT_TEXT - 6} y2={HY} />
          <Label x={RIGHT_TEXT} y={HY + 6} status={status.heart} text={labels.heart} sub={sub.heart} />
        </Zone>

        {/* Head: capacete com visor (restrito para o CMO: cinza + cadeado, BODY-06) */}
        <Zone {...z('head')}>
          <circle
            cx={CX}
            cy="70"
            r="50"
            fill={fillFor(status.head)}
            fillOpacity={fillOpacity(status.head)}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={status.head === 'restricted' ? '5 5' : undefined}
            className={shapeClass(selected === 'head')}
          />
          {/* Visor, reflexo e fones do capacete (decorativos) */}
          <ellipse
            cx={CX}
            cy="72"
            rx="36"
            ry="31"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth="2"
            aria-hidden
          />
          <path
            d={`M${CX - 22} 58 Q${CX - 8} 46 ${CX + 12} 50`}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
          />
          {[CX - 60, CX + 50].map((x) => (
            <rect
              key={`ear-${x}`}
              x={x}
              y="56"
              width="10"
              height="30"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            />
          ))}
          {status.head === 'restricted' && <Lock x={CX - 12} y={60} width={24} height={24} aria-hidden />}
          <Leader x1={CX + 62} y1={72} x2={RIGHT_TEXT - 6} y2={72} />
          <Label x={RIGHT_TEXT} y={78} status={status.head} text={labels.head} sub={sub.head} />
        </Zone>
      </svg>

      {/* Legenda de status (HTML para ficar legível): ícone + texto, nunca só cor */}
      <ul aria-label="Status key" className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-semibold">
        {(['normal', 'attention', 'urgent', 'restricted', 'adapting'] as const).map((s) => (
          <li key={s} style={{ color: COLOR[s] }}>
            <span aria-hidden>{STATUS_META[s].glyph}</span> {STATUS_META[s].label}
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-muted">
        <span>Illustrative rhythm, not a live reading. Select a zone (click, Enter or Space) to see its card.</span>
        <ProvenanceBadge provenance={{ kind: 'simulated' }} />
      </p>
    </>
  )
}
