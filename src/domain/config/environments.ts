// Os 4 modos da plataforma (SPEC adendo §17). Trocados pelo botão de modo de ambiente (K5).
// Regra ENV-04: número sem fonte para o ambiente fica null e NÃO aparece na tela.
import type { MissionMode, MissionProfile } from '@/domain/types'

export const ENVIRONMENTS: Record<MissionMode, MissionProfile> = {
  EARTH: {
    mode: 'EARTH',
    label: 'Earth',
    oneWayDelaySec: 0,
    delayNote: 'On Earth (pre-flight / post-flight): flight surgeon available directly.',
    gravity: 'earth',
    doseRateMSvPerDay: null, // fora do escopo: não exibir número
    exerciseDevices: null, // plano de solo
    emphasizedHazards: ['gravity'], // readaptação à gravidade no retorno
    themeToken: 'earth',
    icon: 'Globe',
  },
  ISS: {
    mode: 'ISS',
    label: 'Space Station',
    oneWayDelaySec: 0,
    delayNote: 'Near real time (~0 s) — illustrative simplification [DECISÃO].',
    gravity: 'micro',
    doseRateMSvPerDay: null, // P-16: sem fonte
    exerciseDevices: ['ARED', 'T2', 'CEVIS'], // [FATO, S13]
    emphasizedHazards: ['isolation', 'gravity', 'hostileEnvironment'],
    themeToken: 'station',
    icon: 'Satellite',
  },
  LUNAR: {
    mode: 'LUNAR',
    label: 'Moon',
    oneWayDelaySec: 1.3, // 384.400 km ÷ 299.792 km/s ≈ 1,28 s (cálculo físico)
    delayNote: '~1.3 s one way (Earth–Moon distance ÷ speed of light).',
    gravity: 'partial', // P-17: fração e fonte a confirmar antes de mostrar número
    doseRateMSvPerDay: null, // P-16: sem fonte
    exerciseDevices: null, // P-18
    emphasizedHazards: ['radiation', 'gravity', 'distance'],
    themeToken: 'moon',
    icon: 'Moon',
  },
  SPACECRAFT: {
    mode: 'SPACECRAFT',
    label: 'Spacecraft',
    oneWayDelaySec: 20 * 60, // cenário: dentro da faixa de 4–24 min [FATO, S10]; valor exato [DECISÃO]
    delayNote: '20 min one way (scenario, within NASA’s 4–24 min range) [S10].',
    gravity: 'micro',
    doseRateMSvPerDay: 1.8, // média de cruzeiro MSL/RAD [S08, S09]
    doseRateProvenance: { kind: 'real', sourceId: 'S09', note: 'MSL/RAD cruise average (galactic cosmic rays)' },
    exerciseDevices: null, // P-18
    emphasizedHazards: ['distance', 'radiation', 'isolation'],
    themeToken: 'spacecraft',
    icon: 'Rocket',
  },
}

export const DEFAULT_ENVIRONMENT: MissionMode = 'SPACECRAFT' // cenário da demo: dia 120, a caminho de Marte

/** Tempo estimado de resposta do solo = 2 × atraso de ida (ESC-03). */
export function groundReplySec(mode: MissionMode): number {
  return 2 * ENVIRONMENTS[mode].oneWayDelaySec
}
