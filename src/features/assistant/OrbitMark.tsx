// Marca do Orbit (L7 §2): disco escuro, anel de órbita inclinado, núcleo branco com pulso (ECG) e um satélite.
// Sem rosto, sem mascote, sem capacete, sem logo da NASA, sem neon e SEM cor de status (o status fica nos chips).
// Estados: idle (parado), thinking (o satélite percorre o anel em ~2,4 s; parado com prefers-reduced-motion e o
// texto "Reading your data…" carrega o estado), attention (o anel ganha um segundo traço fino; não muda de cor).
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/features/environment/backdrops/useBackdropRuntime'

export type OrbitMarkSize = 'sm' | 'md' | 'lg'
export type OrbitMarkState = 'idle' | 'thinking' | 'attention'

const PX: Record<OrbitMarkSize, number> = { sm: 24, md: 40, lg: 96 }

/** Elipse do anel (rx 22, ry 9, girada −24° em torno de 32,32) como caminho, para o satélite seguir. */
const RING_PATH = 'M10 32a22 9 0 1 0 44 0a22 9 0 1 0 -44 0'

export function OrbitMark({
  size = 'md',
  state = 'idle',
  decorative = false,
  className,
}: {
  size?: OrbitMarkSize
  state?: OrbitMarkState
  /** true quando o nome "Orbit" já está em texto ao lado (aria-hidden). */
  decorative?: boolean
  className?: string
}) {
  const px = PX[size]
  // Com prefers-reduced-motion o satélite fica parado; o texto "Reading your data…" carrega o estado.
  const reduced = useReducedMotion()
  const animate = state === 'thinking' && !reduced
  const id = useId().replace(/:/g, '')
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': 'Orbit' }
  return (
    <svg
      viewBox="0 0 64 64"
      width={px}
      height={px}
      data-state={state}
      data-size={size}
      className={cn('orbit-mark shrink-0', className)}
      {...a11y}
    >
      <circle
        cx="32"
        cy="32"
        r="31"
        className="fill-surface"
        stroke="var(--color-foreground)"
        strokeOpacity=".28"
        strokeWidth="1.5"
      />
      <g transform="rotate(-24 32 32)">
        <path id={`ring-${id}`} d={RING_PATH} fill="none" stroke="var(--color-foreground)" strokeWidth="2" />
        {state === 'attention' && (
          <ellipse
            cx="32"
            cy="32"
            rx="25"
            ry="11.5"
            fill="none"
            stroke="var(--color-foreground)"
            strokeOpacity=".55"
            strokeWidth=".9"
          />
        )}
        {animate ? (
          <circle r="3.4" fill="var(--color-foreground)" data-testid="orbit-satellite-moving">
            <animateMotion dur="2.4s" repeatCount="indefinite" rotate="0">
              <mpath href={`#ring-${id}`} />
            </animateMotion>
          </circle>
        ) : null}
      </g>
      <circle cx="32" cy="32" r="8.5" fill="var(--color-foreground)" />
      <path
        d="M26.5 32h3l1.8-3.2 2.6 6.4 1.9-3.2h3.2"
        fill="none"
        stroke="var(--color-surface)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Satélite parado (idle, attention e thinking com reduced-motion). */}
      {!animate && <circle cx="51.2" cy="23.6" r="3.4" fill="var(--color-foreground)" />}
    </svg>
  )
}
