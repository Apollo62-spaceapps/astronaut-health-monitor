// Formatação de números e unidades para a UI (inglês). Números aparecem com a classe `num` (mono tabular).
import type { VitalKind, VitalUnit } from '@/domain/types'

export const VITAL_UNIT: Record<VitalKind, VitalUnit> = {
  heartRate: 'bpm',
  systolicBP: 'mmHg',
  diastolicBP: 'mmHg',
  glucose: 'mg/dL',
  bodyTemp: '°C',
}

/** Rótulo curto (sentence case) de cada vital. */
export const VITAL_LABEL: Record<VitalKind, string> = {
  heartRate: 'Resting heart rate',
  systolicBP: 'Systolic blood pressure',
  diastolicBP: 'Diastolic blood pressure',
  glucose: 'Blood glucose',
  bodyTemp: 'Body temperature',
}

/** Casas decimais por vital (temperatura com 1 casa; o resto inteiro). */
export function formatVitalValue(kind: VitalKind, value: number): string {
  return kind === 'bodyTemp' ? value.toFixed(1) : String(Math.round(value))
}

/** Tempo de resposta em linguagem simples: "about 40 minutes", "about 2.6 seconds". */
export function formatDuration(sec: number): string {
  if (sec >= 60) {
    const min = Math.round(sec / 60)
    return `about ${min} minute${min === 1 ? '' : 's'}`
  }
  return `about ${sec.toFixed(1)} seconds`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Data/hora ISO em UTC legível: "2024-05-11T02:10Z" → "11 May 2024, 02:10 UTC". */
export function formatUtc(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`
}

/** Só a hora UTC: "07:30 UTC". */
export function formatUtcTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
}

/** Dose em mSv sem casa decimal ("216 mSv"). */
export function formatMSv(mSv: number): string {
  return `${Math.round(mSv)}`
}

/** Tempo curto e consistente: "40 min", "2.6 s", "0 s". */
export function formatShortDuration(sec: number): string {
  if (sec >= 60) return `${Math.round(sec / 60)} min`
  if (sec === 0) return '0 s'
  return `${sec.toFixed(1)} s`
}
