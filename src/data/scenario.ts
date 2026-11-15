// Carrega e valida (Zod) o cenário da demo: fixtures [SIMULATED] + evento DONKI [REAL].
// Regerar os fixtures: npm run fixtures (scripts/generate-fixtures.mjs, semente fixa).
import astronautJson from '@/data/fixtures/astronaut.json'
import vitalsJson from '@/data/fixtures/vitals.json'
import wellbeingJson from '@/data/fixtures/wellbeing.json'
import exerciseJson from '@/data/fixtures/exercise.json'
import routineJson from '@/data/fixtures/routine.json'
import donkiJson from '@/data/nasa/donki-sep-2024-05.json'
import {
  astronautSchema,
  donkiSepSchema,
  exerciseSchema,
  routineSchema,
  vitalsFileSchema,
  wellbeingSchema,
} from '@/data/schemas'
import type { ExerciseSession, RoutineItem, SpaceWeatherEvent, VitalReading, WellbeingEntry } from '@/domain/types'

/** Evento real da SPEC (RAD-03): GOES-P SEISS >100 MeV, ligado a flare 01:10 UTC e CME 01:36 UTC. */
export const DEMO_SEP_ID = '2024-05-11T02:10:00-SEP-001'

export const ASTRONAUT = astronautSchema.parse(astronautJson)

const vitals = vitalsFileSchema.parse(vitalsJson)
const donki = donkiSepSchema.parse(donkiJson)

const sep = donki.find((e) => e.sepID === DEMO_SEP_ID)
if (!sep) throw new Error(`Evento ${DEMO_SEP_ID} não está no arquivo do DONKI`)

export const DEMO_SPACE_WEATHER_EVENT: SpaceWeatherEvent = {
  sepID: sep.sepID,
  eventTime: sep.eventTime,
  instrument: sep.instruments.map((i) => i.displayName).join(', '),
  link: sep.link,
  linkedEvents: (sep.linkedEvents ?? []).map((l) => l.activityID),
  provenance: {
    kind: 'real',
    sourceId: 'S07',
    note: 'Real event observed near Earth (NASA DONKI), replayed in this scenario.',
  },
}

/** Dados iniciais do store (state/store.ts). Cópias novas a cada chamada (reset da demo). */
export function demoScenario() {
  return {
    preflight: structuredClone(vitals.preflight) as VitalReading[],
    vitals: structuredClone(vitals.inflight) as VitalReading[],
    wellbeing: structuredClone(wellbeingSchema.parse(wellbeingJson)) as WellbeingEntry[],
    exercise: structuredClone(exerciseSchema.parse(exerciseJson)) as ExerciseSession[],
    routine: structuredClone(routineSchema.parse(routineJson)) as RoutineItem[],
    // Histórico do cenário: 120 dias de trânsito na Spacecraft a 1,8 mSv/dia [S08, S09].
    // A taxa "de hoje" em outro ambiente vem de ENVIRONMENTS[env].doseRateMSvPerDay (null = sem fonte).
    radiation: { careerPriorMSv: ASTRONAUT.careerPriorMSv, missionDayRateMSv: 1.8, careerLimitMSv: 600 as const },
    spaceWeatherEvent: DEMO_SPACE_WEATHER_EVENT,
  }
}
