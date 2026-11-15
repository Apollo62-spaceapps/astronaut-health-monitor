// Gráfico de um vital (CORE-05) com Recharts: série temporal (até ~120 dias) + linha do baseline pré-voo
// e linha do baseline em voo, com traços diferentes. Sem faixas coloridas até P-01 ser decidido.
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Baseline, VitalKind, VitalReading } from '@/domain/types'
import { VITAL_LABEL, VITAL_UNIT, formatVitalValue } from '@/lib/format'

const DAY_MS = 24 * 60 * 60 * 1000
const HEIGHT = 200

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

export function VitalChart({
  kind,
  points,
  baseline,
  xDomain,
}: {
  kind: VitalKind
  points: ChartPoint[]
  baseline: Baseline
  /** [primeiro, último] dia de missão do eixo X; o último é o dia de hoje (BODY-08). */
  xDomain?: [number, number]
}) {
  const unit = VITAL_UNIT[kind]
  const values = [...points.map((p) => p.value), baseline.preflightMean, baseline.inflightMean]
  const pad = (Math.max(...values) - Math.min(...values)) * 0.15 || 1
  const domain: [number, number] = [Math.floor(Math.min(...values) - pad), Math.ceil(Math.max(...values) + pad)]

  const chart = (width?: number) => (
    <LineChart
      data={points}
      width={width}
      height={HEIGHT}
      margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
      accessibilityLayer
    >
      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
      <XAxis
        dataKey="day"
        type="number"
        domain={xDomain ?? ['dataMin', 'dataMax']}
        allowDataOverflow
        tickFormatter={(d: number) => `D${Math.round(d)}`}
        stroke="var(--color-muted)"
        fontSize={12}
        fontFamily="var(--font-mono)"
      />
      <YAxis domain={domain} width={44} stroke="var(--color-muted)" fontSize={12} fontFamily="var(--font-mono)" />
      <Tooltip
        contentStyle={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(255,255,255,0.15)',
          fontFamily: 'var(--font-mono)',
        }}
        labelFormatter={(d) => `Mission day ${Math.round(Number(d))}`}
        formatter={(v) => [`${formatVitalValue(kind, Number(v))} ${unit}`, VITAL_LABEL[kind]]}
      />
      <ReferenceLine
        y={baseline.preflightMean}
        stroke="var(--color-muted)"
        strokeDasharray="8 4"
        label={{ value: 'Pre-flight baseline', position: 'insideTopLeft', fill: 'var(--color-muted)', fontSize: 11 }}
      />
      <ReferenceLine
        y={baseline.inflightMean}
        stroke="var(--color-link)"
        strokeDasharray="2 3"
        label={{
          value: `In-flight baseline (${baseline.windowDays} d)`,
          position: 'insideBottomLeft',
          fill: 'var(--color-link)',
          fontSize: 11,
        }}
      />
      <Line
        type="monotone"
        dataKey="value"
        name={VITAL_LABEL[kind]}
        stroke="#ffffff"
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  )

  // ResponsiveContainer precisa de ResizeObserver (ausente em jsdom nos testes).
  return (
    <figure aria-label={`${VITAL_LABEL[kind]} over time, with pre-flight and in-flight baselines`} className="w-full">
      {typeof ResizeObserver === 'undefined' ? (
        chart(560)
      ) : (
        <ResponsiveContainer width="100%" height={HEIGHT}>
          {chart()}
        </ResponsiveContainer>
      )}
    </figure>
  )
}
