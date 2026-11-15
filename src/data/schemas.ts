// Validação (Zod) de tudo que entra no app: fixtures, evento DONKI e entrada do usuário.
// Todo acesso aos fixtures passa por aqui (SPEC §9, adaptador de dados).
import { z } from 'zod'
import type { SourceId } from '@/domain/types'
import { MISSION_MODES, VITAL_KINDS } from '@/domain/types'

export const sourceIdSchema = z.custom<SourceId>((v) => typeof v === 'string' && /^S\d+$/.test(v), 'SourceId (S01…)')

export const provenanceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('real'), sourceId: sourceIdSchema, note: z.string().optional() }),
  z.object({ kind: z.literal('simulated'), basis: sourceIdSchema.optional(), note: z.string().optional() }),
])

const vitalKind = z.enum(VITAL_KINDS as [string, ...string[]]).transform((v) => v as (typeof VITAL_KINDS)[number])
const missionMode = z.enum(MISSION_MODES as [string, ...string[]]).transform((v) => v as (typeof MISSION_MODES)[number])

export const vitalReadingSchema = z.object({
  kind: vitalKind,
  value: z.number().finite(),
  unit: z.enum(['bpm', 'mmHg', 'mg/dL', '°C']),
  takenAt: z.string().datetime(),
  provenance: provenanceSchema,
})

export const astronautSchema = z.object({
  id: z.string(),
  name: z.string(),
  crewRole: z.string(),
  missionDay: z.number().int(),
  careerPriorMSv: z.number().min(0),
  provenance: provenanceSchema,
})

export const vitalsFileSchema = z.object({
  preflight: z.array(vitalReadingSchema).min(1),
  inflight: z.array(vitalReadingSchema).min(1),
})

export const wellbeingSchema = z.array(
  z.object({
    date: z.string(),
    environment: missionMode.optional(),
    mood: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    sleepHours: z.number().min(0).max(24),
    note: z.string().optional(),
  }),
)

export const exerciseSchema = z.array(
  z.object({
    date: z.string(),
    device: z.enum(['ARED', 'T2', 'CEVIS']),
    prescribedMin: z.number().min(0),
    doneMin: z.number().min(0),
    status: z.enum(['done', 'partial', 'skipped', 'postponed']),
    selfReported: z.literal(true),
    reason: z.string().optional(),
  }),
)

export const routineSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    kind: z.enum(['measure', 'checkin', 'exercise', 'maintenance']),
    vital: vitalKind.optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    environments: z.array(missionMode).min(1),
    status: z.enum(['due', 'overdue', 'done', 'postponed']),
    provenance: provenanceSchema,
  }),
)

/** Resposta crua do DONKI GET /get/SEP (só os campos usados). */
export const donkiSepSchema = z.array(
  z.object({
    sepID: z.string(),
    eventTime: z.string(),
    instruments: z.array(z.object({ displayName: z.string() })),
    link: z.string().url(),
    linkedEvents: z.array(z.object({ activityID: z.string() })).nullable(),
  }),
)
