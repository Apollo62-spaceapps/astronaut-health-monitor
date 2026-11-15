// Tripulação sintética do Crew outlook (L7, Orbit §5A). Fixture SIMULATED validado por Zod.
// "Mesmo valor, dois tripulantes" (demo do Kayque): Crew B e Crew C estão os dois com 78 bpm hoje, mas com
// referências pré-voo diferentes (68 e 76 bpm), então os níveis saem diferentes.
import { z } from 'zod'
import crewJson from '@/data/fixtures/crew.json'

export const crewFileSchema = z.object({
  note: z.string(),
  crew: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().regex(/^Crew [A-Z]$/),
        hr: z.object({ preflightMean: z.number().positive(), series: z.array(z.number().positive()).min(2) }),
        sleepHours: z.array(z.number().min(0).max(24)).min(1),
        mood: z.array(z.number().int().min(1).max(5)).min(1),
        adherencePct: z.number().min(0).max(200),
        careerPriorMSv: z.number().min(0),
        postponedSessions: z.number().int().min(0),
      }),
    )
    .min(1),
})

export type SyntheticCrewMember = z.infer<typeof crewFileSchema>['crew'][number]

export const SYNTHETIC_CREW: readonly SyntheticCrewMember[] = crewFileSchema.parse(crewJson).crew
