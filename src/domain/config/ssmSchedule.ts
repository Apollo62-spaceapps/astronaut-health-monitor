// Cronograma de EXEMPLO das NASA Spaceflight Standard Measures, missão de 6 meses (L7, Orbit §5C).
// L- = dias antes do lançamento, FD = dia de voo, R- / R+ = antes / depois do retorno.
// Fonte principal S23 (2020). S24 (2018) diverge em parte (ex.: actigrafia pré-voo em L-270 e L-180):
// a UI mostra "Example schedule from NASA Standard Measures — sources differ" e cita as duas.
import type { SourceId } from '@/domain/types'

export interface SsmScheduleRow {
  domain: string
  preflight: string
  inflight: string
  postflight: string
  sourceIds: SourceId[]
}

export const SSM_SCHEDULE_NOTE = 'Example schedule from NASA Standard Measures — sources differ (S23, S24).'

export const SSM_SCHEDULE: readonly SsmScheduleRow[] = [
  {
    domain: 'Actigraphy and sleep log',
    preflight: 'L-180, L-90 (2 weeks each)',
    inflight: 'Continuous (FD1 to R-0)',
    postflight: 'R+0 (2 weeks)',
    sourceIds: ['S23', 'S24'],
  },
  { domain: 'Sleep and team questionnaire', preflight: '—', inflight: 'Monthly', postflight: '—', sourceIds: ['S23'] },
  {
    domain: 'Cognition (10 brief tests)',
    preflight: 'L-120 (practice), L-90',
    inflight: 'FD30, R-30',
    postflight: 'R+10, R+30',
    sourceIds: ['S23'],
  },
  {
    domain: 'Cellular profile (blood, saliva)',
    preflight: 'L-180, L-90',
    inflight: 'About FD30, R-30',
    postflight: 'R+30',
    sourceIds: ['S23', 'S24'],
  },
  {
    domain: 'Biochemistry (blood, urine)',
    preflight: 'L-180',
    inflight: 'FD30, R-30 (blood)',
    postflight: 'R+30',
    sourceIds: ['S23'],
  },
  { domain: 'Microbiome', preflight: 'L-90', inflight: 'FD30, R-30', postflight: 'R+30', sourceIds: ['S23'] },
  {
    domain: 'Sensorimotor (includes heart rate and blood pressure)',
    preflight: 'L-180, L-90',
    inflight: '—',
    postflight: 'R+0 (landing), R+0, R+9',
    sourceIds: ['S23'],
  },
]

/** Marcos de acompanhamento depois do retorno à Terra (só marcos; não é tempo de recuperação). */
export const RETURN_MILESTONES = ['R+0', 'R+9', 'R+30'] as const
