// Gráfico de um vital (CORE-05, DESIGN-SYSTEM v2 §Gráficos): UMA referência (faixa cinza = baseline pré-voo
// ± limiar de atenção, ilustrativo até P-01), média móvel de 7 dias e o valor de hoje destacado com a cor do status.
// Sem pontos diários (ficam no tooltip), sem legenda (rótulo direto), sem anotações que não afetam esta métrica.
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AlertLevel, Baseline, VitalKind, VitalReading } from '@/domain/types'
import { VITAL_DEVIATION_PCT } from '@/domain/config/thresholds'
import { VITAL_LABEL, VITAL_UNIT, formatVitalValue } from '@/lib/format'

const DAY_MS = 24 * 60 * 60 * 1000
const HEIGHT = 200
const AVG_WINDOW_DAYS = 7

const STATUS_COLOR: Record<AlertLevel, string> = {
  normal: 'var(--color-normal)',
  attention: 'var(--color-attention)',
  urgent: 'var(--color-urgent)',
}

export interface ChartPoint {
  day: number
  value: number
}

/** Leituras → pontos por dia de missão (até `nowIso`, últimos `maxDays` dias). */
export function chartPoints(
  readings: readonly VitalReading[],
  missionStartIso: string,
  nowIso: string,
  maxDays = 120,
): ChartPoint[] {
  const start = Date.parse(missionStartIso)
  const now = Date.parse(nowIso)
  return readings
    .filter((r) => Date.parse(r.takenAt) <= now && Date.parse(r.takenAt) > now - maxDays * DAY_MS)
    .sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt))
    .map((r) => ({ day: Math.round(((Date.parse(r.takenAt) - start) / DAY_MS) * 10) / 10, value: r.value }))
}

/** Média móvel: para cada ponto, a média das leituras dos últimos `AVG_WINDOW_DAYS` dias. */
export function movingAverage(points: ChartPoint[]): (ChartPoint & { avg: number })[] {
  return points.map((p) => {
    const win = points.filter((q) => q.day > p.day - AVG_WINDOW_DAYS && q.day <= p.day)
    return { ...p, avg: win.reduce((a, q) => a + q.value, 0) / win.length }
  })
}

export function VitalChart({
  kind,
  points,
  baseline,
  status,
  xDomain,
}: {
  kind: VitalKind
  points: ChartPoint[]
  baseline: Baseline
  /** Nível do valor de hoje (vem do motor de regras); colore só o ponto de hoje. */
  status: AlertLevel
  /** [primeiro, último] dia de missão do eixo X; o último é o dia de hoje (BODY-08). */
  xDomain?: [number, number]
}) {
  const unit = VITAL_UNIT[kind]
  const data = movingAverage(points)
  const today = points.at(-1)
  // Faixa = baseline pré-voo ± limiar de atenção (PENDENTE P-01 — valores ilustrativos).
  const pct = VITAL_DEVIATION_PCT[kind].attention / 100
  const bandLow = baseline.preflightMean * (1 - pct)
  const bandHigh = baseline.preflightMean * (1 + pct)
  const values = [...data.map((p) => p.avg), today?.value ?? baseline.preflightMean, bandLow, bandHigh]
  const pad = (Math.max(...values) - Math.min(...values)) * 0.12 || 1
  const domain: [number, number] = [Math.floor(Math.min(...values) - pad), Math.ceil(Math.max(...values) + pad)]
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(domain[0] + ((domain[1] - domain[0]) * i) / 4))

  const chart = (width?: number) => (
    <LineChart
      data={data}
      width={width}
      height={HEIGHT}
      margin={{ top: 12, right: 104, bottom: 4, left: 0 }}
      accessibilityLayer
    >
      <CartesianGrid stroke="var(--color-border)" vertical={false} />
      <XAxis
        dataKey="day"
        type="number"
        domain={xDomain ?? ['dataMin', 'dataMax']}
        allowDataOverflow
        ticks={xDomain ? [xDomain[0], Math.round((xDomain[0] + xDomain[1]) / 2), xDomain[1]] : undefined}
        tickFormatter={(d: number) => `Day ${Math.round(d)}`}
        stroke="var(--color-muted)"
        tickLine={false}
        fontSize={11}
        fontFamily="var(--font-mono)"
      />
      <YAxis
        domain={domain}
        ticks={yTicks}
        width={40}
        stroke="var(--color-muted)"
        axisLine={false}
        tickLine={false}
        fontSize={11}
        fontFamily="var(--font-mono)"
      />
      <Tooltip
        contentStyle={{
          background: 'var(--color-surface-2)',
          border: 'none',
          borderRadius: 10,
          // Texto em Plex Sans; números com algarismos tabulares (DESIGN-SYSTEM v2 §2: mono só em números).
          fontFamily: 'var(--font-sans)',
          fontVariantNumeric: 'tabular-nums',
        }}
        labelFormatter={(d) => `Day ${Math.round(Number(d))}`}
        formatter={(v, name) => [
          `${formatVitalValue(kind, Number(v))} ${unit}`,
          name === 'avg' ? '7-day average' : 'Reading',
        ]}
      />
      <ReferenceArea
        y1={bandLow}
        y2={bandHigh}
        fill="var(--color-foreground)"
        fillOpacity={0.07}
        stroke="none"
        ifOverflow="extendDomain"
        label={{ value: 'Your normal range', position: 'insideBottomLeft', fill: 'var(--color-muted)', fontSize: 11 }}
      />
      {/* Bordas da faixa: o preenchimento tem 1,22:1 com o fundo; as bordas em muted, 7,7:1 (WCAG 1.4.11). */}
      {[bandLow, bandHigh].map((y) => (
        <ReferenceLine
          key={y}
          y={y}
          stroke="var(--color-muted)"
          strokeWidth={1}
          strokeDasharray="2 3"
          ifOverflow="extendDomain"
        />
      ))}
      <Line
        type="monotone"
        dataKey="avg"
        stroke="#ffffff"
        strokeWidth={1.75}
        dot={false}
        activeDot={{ r: 3 }}
        isAnimationActive={false}
      />
      <Line dataKey="value" stroke="none" dot={false} activeDot={false} isAnimationActive={false} legendType="none" />
      {today && (
        <ReferenceDot
          x={today.day}
          y={today.value}
          r={5}
          fill={STATUS_COLOR[status]}
          stroke="var(--color-surface)"
          strokeWidth={2}
          ifOverflow="visible"
          label={{
            value: `${formatVitalValue(kind, today.value)} today`,
            position: 'right',
            fill: 'var(--color-foreground)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
        />
      )}
    </LineChart>
  )

  // ResponsiveContainer precisa de ResizeObserver (ausente em jsdom nos testes).
  return (
    <figure
      aria-label={`${VITAL_LABEL[kind]}: 7-day average over time against your normal range, today's value highlighted`}
      className="w-full"
    >
      {typeof ResizeObserver === 'undefined' ? (
        chart(560)
      ) : (
        <ResponsiveContainer width="100%" height={HEIGHT}>
          {chart()}
        </ResponsiveContainer>
      )}
      <figcaption className="mt-1 text-[11px] text-muted">
        Line: {AVG_WINDOW_DAYS}-day average · Range: pre-flight baseline ±{VITAL_DEVIATION_PCT[kind].attention}%
        (illustrative)
      </figcaption>
    </figure>
  )
}
