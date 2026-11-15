// Textos do card de cada zona (BODY-03, CORE-08). Inglês, curto, sem diagnóstico.
// Só repete o que está na base da SPEC §6.1.1 (S19); o que não tem fonte cai em "Consult your flight surgeon."
import type { BodyZoneId, SourceId } from '@/domain/types'

export const CONSULT = 'Consult your flight surgeon.'

/** Ações permitidas (CORE-09). */
export const ZONE_ACTIONS = ['Re-measure', 'Notify CMO', 'Follow the onboard medical checklist'] as const

export interface ZoneContent {
  howToMeasure: string
  /** Por que importa, com a fonte. null = sem fonte → CONSULT. */
  whyItMatters: { text: string; sourceIds: SourceId[] } | null
}

export const ZONE_CONTENT: Record<BodyZoneId, ZoneContent> = {
  head: {
    howToMeasure: 'Daily self-report check-in: mood (1–5) and hours of sleep. Self-report, not a clinical assessment.',
    whyItMatters: {
      text: 'NASA links sleep, circadian rhythm and behavioral health to isolation and confinement.',
      sourceIds: ['S19'],
    },
  },
  heart: {
    howToMeasure: 'Resting heart rate and blood pressure, logged from the mission routine.',
    whyItMatters: {
      text: 'NASA reports changes in heart function in flight, and difficulty keeping blood pressure stable when standing after a change in gravity (orthostatic intolerance).',
      sourceIds: ['S19'],
    },
  },
  torso: {
    howToMeasure: 'Blood glucose, logged from the mission routine.',
    whyItMatters: null, // P-13: ligação com hazard sem fonte
  },
  skin: {
    howToMeasure: 'Body temperature, logged from the mission routine.',
    whyItMatters: {
      text: 'Team inference: NASA reports altered immune function and microbes that pass more easily between people in a closed habitat. We use temperature as a possible sign of infection.',
      sourceIds: ['S19'],
    },
  },
  arms: {
    howToMeasure: 'Exercise sessions you check in (self-report), including resistance work on the arms.',
    whyItMatters: {
      text: 'NASA reports bone and muscle loss in microgravity.',
      sourceIds: ['S19'],
    },
  },
  legs: {
    howToMeasure: 'Exercise sessions you check in (self-report).',
    whyItMatters: {
      text: 'NASA reports bone and muscle loss in microgravity.',
      sourceIds: ['S19'],
    },
  },
}
