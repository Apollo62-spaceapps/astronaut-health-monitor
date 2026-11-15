// Gráfico de um vital (CORE-05) com Recharts. Linha principal = média móvel de 7 dias; as leituras diárias
// aparecem como pontos pequenos. Linhas de referência: baseline pré-voo (exame dos 14 dias antes do lançamento,
// L-14…L-1, também plotado) e baseline em voo. Os nomes ficam numa legenda fora da área de plotagem.
// Sem faixas coloridas até P-01 ser decidido. Só tokens do design system.
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Baseline, VitalKind, VitalReading } from '@/domain/types'
import { VITAL_LABEL, VITAL_UNIT, formatVitalValue } from '@/lib/format'

const DAY_MS = 24 * 60 * 60 * 1000
const HEIGHT = 200
const AVG_DAYS = 7

export interface ChartPoint {
  day: number
  value: number
  /** Média móvel dos últimos 7 dias (inclusive). */
  avg: number
}

/** Leituras → pontos por dia de missão (até `nowIso`, últimos `maxDays` dias), com média móvel de 7 dias. */
export function chartPoints(
  readings: readonly VitalReading[],
  missionStartIso: string,
  nowIso: string,
  maxDays = 120,
): ChartPoint[] {
  const start = Date.parse(missionStartIso)
  const now = Date.parse(nowIso)
  const pts = readings
    .filter((r) => Date.parse(r.takenAt) <= now && Date.parse(r.takenAt) > now - maxDays * DAY_MS)
    .sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt))
    .map((r) => ({ day: Math.round(((Date.parse(r.takenAt) - start) / DAY_MS) * 10) / 10, value: r.value }))
  return pts.map((p) => {
    const win = pts.filter((q) => q.day > p.day - AVG_DAYS && q.day <= p.day)
    return { ...p, avg: win.reduce((a, q) => a + q.value, 0) / win.length }
  })
}

/** "L-14" antes do lançamento, "D120" em voo. */
export const dayTick = (d: number) => (d < 0 ? `L${Math.round(d)}` : `D${Math.round(d)}`)

export function VitalChart({
  kind,
  points,
  baseline,
  xDomain,
}: {
  kind: VitalKind
  points: ChartPoint[]
  baseline: Baseline
  /** [primeiro, último] dia do eixo X; o último é o dia de hoje (BODY-08). Negativo = pré-voo. */
  xDomain?: [number, number]
}) {
  const unit = VITAL_UNIT[kind]
  const values = [...points.map((p) => p.value), baseline.preflightMean, baseline.inflightMean]
  // Ticks com passo "redondo" e casas decimais fixas (temperatura: 36.0 / 36.5 / 37.0…).
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const steps = kind === 'bodyTemp' ? [0.5, 1] : [2, 5, 10, 20]
  const step = steps.find((s) => (hi - lo) / s <= 5) ?? steps[steps.length - 1]!
  const domain: [number, number] = [Math.floor(lo / step) * step, Math.ceil(hi / step) * step]
  if (domain[1] - domain[0] < step * 2) domain[1] += step
  const yTicks: number[] = []
  for (let v = domain[0]; v <= domain[1] + 1e-9; v += step) yTicks.push(Math.round(v * 10) / 10)
  const [x0, x1] = xDomain ?? [points[0]?.day ?? 0, points[points.length - 1]?.day ?? 0]
  const xTicks = [x0, ...[0, 30, 60, 90].filter((d) => d > x0 + 10 && d < x1 - 10), x1]
  const fmtY = (v: number) => (kind === 'bodyTemp' ? v.toFixed(1) : String(Math.round(v)))

  const chart = (width?: number) => (
    <ComposedChart
      data={points}
      width={width}
      height={HEIGHT}
      margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
      accessibilityLayer
    >
      <CartesianGrid stroke="var(--color-border)" vertical={false} />
      <XAxis
        dataKey="day"
        type="number"
        domain={[x0, x1]}
        ticks={xTicks}
        allowDataOverflow
        tickFormatter={dayTick}
        stroke="var(--color-muted)"
        fontSize={12}
        fontFamily="var(--font-mono)"
      />
      <YAxis
        domain={domain}
        ticks={yTicks}
        width={48}
        tickFormatter={fmtY}
        stroke="var(--color-muted)"
        fontSize={12}
        fontFamily="var(--font-mono)"
      />
      <Tooltip
        contentStyle={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          fontFamily: 'var(--font-mono)',
        }}
        labelFormatter={(d) => (Number(d) < 0 ? `Pre-flight ${dayTick(Number(d))}` : `Mission day ${Math.round(Number(d))}`)}
        formatter={(v, name) => [`${formatVitalValue(kind, Number(v))} ${unit}`, name]}
      />
      <ReferenceLine x={0} stroke="var(--color-border)" />
      <ReferenceLine y={baseline.preflightMean} stroke="var(--color-muted)" strokeDasharray="8 4" />
      <ReferenceLine y={baseline.inflightMean} stroke="var(--color-muted)" strokeDasharray="2 3" />
      <Scatter
        dataKey="value"
        name="Daily reading"
        fill="var(--color-muted)"
        fillOpacity={0.55}
        shape={(p: { cx?: number; cy?: number }) => <circle cx={p.cx} cy={p.cy} r={1.8} fill="var(--color-muted)" fillOpacity={0.55} />}
        isAnimationActive={false}
      />
      <Line
        type="monotone"
        dataKey="avg"
        name="7-day average"
        stroke="var(--color-link)"
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    </ComposedChart>
  )

  // ResponsiveContainer precisa de ResizeObserver (ausente em jsdom nos testes).
  return (
    <figure aria-label={`${VITAL_LABEL[kind]} over time, with pre-flight and in-flight baselines`} className="w-full">
      <ul aria-label="Chart legend" className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-5 bg-link" />
          7-day average
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-muted/60" />
          Daily reading
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-5 border-t-2 border-dashed border-muted" />
          Pre-flight baseline <span className="num">{formatVitalValue(kind, baseline.preflightMean)}</span> (exam L-14…L-1)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-5 border-t-2 border-dotted border-muted" />
          In-flight baseline <span className="num">{formatVitalValue(kind, baseline.inflightMean)}</span> (last{' '}
          <span className="num">{baseline.windowDays}</span> d)
        </li>
      </ul>
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
