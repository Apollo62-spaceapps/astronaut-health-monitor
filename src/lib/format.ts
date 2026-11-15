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
