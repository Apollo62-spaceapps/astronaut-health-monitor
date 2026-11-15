// Base de conhecimento LOCAL do Orbit (Edge RAG, L7b). Roda 100% offline, sem rede e sem modelo.
// Cada passagem resume só o que o projeto já afirma com fonte do catálogo (src/data/sources.ts, CLAUDE.md §0.5):
// nada de limiar clínico novo, conduta, doença ou dose. A recuperação é BM25 sobre título + texto + palavras-chave.
// O Orbit cita a fonte de cada passagem usada ([Sxx]) e diz quando não tem fonte ("I won't guess").
import type { SourceId } from '@/domain/types'

export interface Passage {
  id: string
  title: string
  text: string
  sourceIds: SourceId[]
  /** Termos extras para a busca (sinônimos em inglês). */
  keywords: string[]
}

export const KNOWLEDGE: readonly Passage[] = [
  {
    id: 'hrp-hazards',
    title: 'The five hazards of human spaceflight',
    text: 'NASA’s Human Research Program groups the risks of spaceflight into five hazards: space radiation, isolation and confinement, distance from Earth, altered gravity fields, and hostile, closed environments.',
    sourceIds: ['S19'],
    keywords: ['hazard', 'hazards', 'risk', 'risks', 'hrp', 'spaceflight', 'danger', 'five'],
  },
  {
    id: 'heart-gravity',
    title: 'Heart and blood pressure after a gravity change',
    text: 'NASA reports changes in heart function in flight, and difficulty keeping blood pressure stable when standing after a change in gravity, known as orthostatic intolerance.',
    sourceIds: ['S19'],
    keywords: [
      'heart',
      'cardio',
      'blood',
      'pressure',
      'bp',
      'orthostatic',
      'standing',
      'dizzy',
      'pulse',
      'rate',
      'gravity',
    ],
  },
  {
    id: 'bone-muscle',
    title: 'Bone and muscle in microgravity',
    text: 'NASA reports bone and muscle loss in microgravity. Exercise is the countermeasure the crew uses every day to limit it.',
    sourceIds: ['S19', 'S21'],
    keywords: [
      'bone',
      'bones',
      'muscle',
      'muscles',
      'legs',
      'arms',
      'strength',
      'density',
      'microgravity',
      'exercise',
      'countermeasure',
    ],
  },
  {
    id: 'iss-exercise',
    title: 'Exercise devices on the Space Station',
    text: 'On the International Space Station the crew trains on three devices: ARED for resistance, the T2 treadmill and the CEVIS cycle ergometer, about two hours a day on average.',
    sourceIds: ['S13'],
    keywords: [
      'ared',
      't2',
      'cevis',
      'treadmill',
      'cycle',
      'exercise',
      'workout',
      'training',
      'station',
      'iss',
      'device',
      'devices',
    ],
  },
  {
    id: 'sleep-behavior',
    title: 'Sleep and behavioral health',
    text: 'NASA links sleep, circadian rhythm and behavioral health to isolation and confinement. Mood and sleep are self-reported here and stay private to the astronaut.',
    sourceIds: ['S19', 'S02'],
    keywords: [
      'sleep',
      'tired',
      'fatigue',
      'insomnia',
      'mood',
      'stress',
      'isolation',
      'confinement',
      'circadian',
      'behavioral',
      'mental',
    ],
  },
  {
    id: 'immune',
    title: 'Immune function in a closed habitat',
    text: 'NASA reports altered immune function and microbes that pass more easily between people in a closed habitat. The team uses body temperature as one possible sign worth watching.',
    sourceIds: ['S19'],
    keywords: ['immune', 'temperature', 'temp', 'fever', 'skin', 'microbes', 'habitat', 'closed', 'sick'],
  },
  {
    id: 'adaptation',
    title: 'Adapting to a new gravity field',
    text: 'A change in gravity affects orientation, balance and coordination. Motion sickness during adaptation lasts about three days on average, so the app shows some readings as Adapting during that window. Urgent is never masked.',
    sourceIds: ['S19', 'S04'],
    keywords: [
      'adapting',
      'adaptation',
      'gravity',
      'balance',
      'orientation',
      'coordination',
      'motion',
      'sickness',
      'moon',
      'landing',
      'arrival',
      'window',
    ],
  },
  {
    id: 'radiation-limit',
    title: 'Career radiation limit',
    text: 'NASA sets a career radiation limit of 600 mSv for each astronaut. The app shows career dose as a share of that limit.',
    sourceIds: ['S03'],
    keywords: ['radiation', 'dose', 'limit', 'career', 'msv', 'sievert', 'exposure'],
  },
  {
    id: 'radiation-cruise',
    title: 'Radiation dose in deep space',
    text: 'During the cruise to Mars, the RAD instrument on the Mars Science Laboratory measured about 1.8 mSv per day from galactic cosmic rays. The scenario uses that rate only for the Spacecraft; elsewhere the rate is not sourced and no number is added.',
    sourceIds: ['S08', 'S09'],
    keywords: [
      'radiation',
      'cosmic',
      'rays',
      'gcr',
      'cruise',
      'mars',
      'deep',
      'space',
      'dose',
      'rate',
      'msl',
      'rad',
      'spacecraft',
    ],
  },
  {
    id: 'shelter',
    title: 'Radiation shelter procedure',
    text: 'The shelter flow is adapted from the NASA Orion procedure: open the shelter stowage, place the cargo bags to cover the least-protected areas (there is up to one hour to prepare), and stay in the shelter until cleared, which can take up to 24 hours.',
    sourceIds: ['S05'],
    keywords: [
      'shelter',
      'solar',
      'flare',
      'storm',
      'particle',
      'event',
      'sep',
      'orion',
      'cargo',
      'bags',
      'protect',
      'protection',
    ],
  },
  {
    id: 'donki',
    title: 'Real solar particle event in the scenario',
    text: 'The solar particle event in the demo is a real event observed near Earth on 11 May 2024 and recorded in NASA’s DONKI database. It is replayed in this scenario.',
    sourceIds: ['S07'],
    keywords: ['solar', 'particle', 'event', 'sep', 'donki', 'flare', 'cme', 'real', 'space', 'weather'],
  },
  {
    id: 'mars-delay',
    title: 'Communication delay to Mars',
    text: 'NASA cites a one-way delay of about 4 to 24 minutes between Earth and Mars, and communication blackouts of up to 2 to 3 weeks around solar conjunction. A reply from the ground can therefore take most of an hour.',
    sourceIds: ['S10', 'S11', 'S20'],
    keywords: [
      'delay',
      'latency',
      'communication',
      'ground',
      'reply',
      'mars',
      'blackout',
      'conjunction',
      'houston',
      'minutes',
      'earth',
    ],
  },
  {
    id: 'moon-delay',
    title: 'Communication delay to the Moon',
    text: 'The Moon is about 384,400 km away, so a radio signal takes about 1.3 seconds each way, and a reply about 2.6 seconds.',
    sourceIds: [],
    keywords: ['moon', 'lunar', 'delay', 'seconds', 'distance', 'reply', 'communication'],
  },
  {
    id: 'cmo-role',
    title: 'The crew medical officer',
    text: 'NASA standards call for a crew medical officer on each vehicle, at least two per crew, and keep medical communications private.',
    sourceIds: ['S02'],
    keywords: ['cmo', 'medical', 'officer', 'doctor', 'crew', 'private', 'privacy', 'who'],
  },
  {
    id: 'flight-surgeon',
    title: 'Flight surgeon and the onboard checklist',
    text: 'On the ground, the crew surgeon holds medical authority, with private medical conferences. Onboard, the crew follows the medical checklist that flies with them.',
    sourceIds: ['S04'],
    keywords: ['flight', 'surgeon', 'doctor', 'checklist', 'medical', 'conference', 'ground', 'authority', 'procedure'],
  },
  {
    id: 'eimo',
    title: 'Earth-independent medical operations',
    text: 'NASA Ames studies clinical decision support for Earth-independent medical operations: tools that help a crew act when the ground is far away. Orbit is inspired by that idea and is not endorsed by NASA.',
    sourceIds: ['S12'],
    keywords: ['eimo', 'decision', 'support', 'independent', 'autonomy', 'ai', 'orbit', 'tool', 'offline'],
  },
  {
    id: 'ssm-overview',
    title: 'NASA Spaceflight Standard Measures',
    text: 'The Standard Measures collect the same set of data from astronauts before, during and after flight, across six domains: behavioral health and performance, biochemistry, cardiovascular, cellular profile and immunology, microbiology, and sensorimotor.',
    sourceIds: ['S22', 'S25'],
    keywords: [
      'standard',
      'measures',
      'ssm',
      'baseline',
      'domains',
      'research',
      'preflight',
      'pre-flight',
      'postflight',
    ],
  },
  {
    id: 'ssm-schedule',
    title: 'Example schedule of the Standard Measures',
    text: 'In an example six-month mission, many measures are taken before launch (for example at 180 and 90 days before), around flight day 30 and 30 days before return, and again after landing up to 30 days later. Published schedules differ slightly.',
    sourceIds: ['S23', 'S24'],
    keywords: [
      'schedule',
      'baseline',
      'session',
      'sessions',
      'preflight',
      'pre-flight',
      'return',
      'landing',
      'follow-up',
      'reference',
    ],
  },
  {
    id: 'ssm-caveat',
    title: 'What research measures do not say',
    text: 'NASA’s Standard Measures are research measures for longitudinal analysis. They do not define health or readiness, and neither does this prototype: it compares each person with their own reference.',
    sourceIds: ['S28'],
    keywords: ['readiness', 'normal', 'health', 'reference', 'baseline', 'personal', 'compare', 'myself'],
  },
  {
    id: 'hrp-risks-ssm',
    title: 'HRP risks followed by the Standard Measures',
    text: 'The risks the Standard Measures help follow include orthostatic intolerance, reduced aerobic capacity, muscle and bone loss, sensorimotor and vision changes, space radiation exposure, limited in-flight medical capability, cognitive or behavioral decrements, and sleep loss with work overload.',
    sourceIds: ['S23'],
    keywords: ['risk', 'risks', 'outlook', 'crew', 'vision', 'aerobic', 'sensorimotor', 'cognitive', 'workload', 'eva'],
  },
  {
    id: 'analogs',
    title: 'Analog missions on Earth',
    text: 'Analog studies on Earth follow small crews in isolation, such as HERA in Houston with four people for about 45 days, using the same Standard Measures.',
    sourceIds: ['S26'],
    keywords: ['analog', 'hera', 'crew', 'isolation', 'study', 'four', 'team'],
  },
  {
    id: 'artemis',
    title: 'Standard Measures for Artemis II',
    text: 'NASA added a lunar branch of the Standard Measures for Artemis II, including balance and motion tests and physical tasks right after return.',
    sourceIds: ['S27'],
    keywords: ['artemis', 'moon', 'lunar', 'return', 'balance', 'tests'],
  },
  {
    id: 'personal-reference',
    title: 'How this app reads your numbers',
    text: 'Each reading is compared with the astronaut’s own pre-flight exam, not with a population range. After a gravity change the reference is rebuilt from readings in the new environment; back on Earth it is compared with the pre-flight exam again. The thresholds are illustrative until the team sources them.',
    sourceIds: ['S23'],
    keywords: [
      'reference',
      'baseline',
      'normal',
      'threshold',
      'thresholds',
      'personal',
      'compare',
      'deviation',
      'percent',
      'range',
    ],
  },
]

const STOP = new Set(
  'a an the and or of to in on at for is are was were be been my me i you your it this that what why how when where who do does did can could should would will with from about as by there their them they than then so if not no yes am'.split(
    ' ',
  ),
)

export const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9-]+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))
    // plural simples: "hazards" encontra "hazard"
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))

interface Indexed {
  p: Passage
  terms: Map<string, number>
  len: number
}

const INDEX: Indexed[] = KNOWLEDGE.map((p) => {
  // Título e palavras-chave pesam mais que o corpo.
  const tokens = [
    ...tokenize(p.title),
    ...tokenize(p.title),
    ...tokenize(p.text),
    ...p.keywords.flatMap((k) => [...tokenize(k), ...tokenize(k)]),
  ]
  const terms = new Map<string, number>()
  for (const t of tokens) terms.set(t, (terms.get(t) ?? 0) + 1)
  return { p, terms, len: tokens.length }
})
const AVG = INDEX.reduce((a, d) => a + d.len, 0) / INDEX.length
const DF = new Map<string, number>()
for (const d of INDEX) for (const t of d.terms.keys()) DF.set(t, (DF.get(t) ?? 0) + 1)

export interface Hit {
  passage: Passage
  score: number
}

/** BM25 (k1 = 1,2; b = 0,75). Determinístico: empate → ordem do catálogo. */
export function retrieve(query: string, k = 3, minScore = 1.2): Hit[] {
  const q = [...new Set(tokenize(query))]
  if (!q.length) return []
  const N = INDEX.length
  const hits = INDEX.map((d, i) => {
    let score = 0
    for (const t of q) {
      const f = d.terms.get(t)
      if (!f) continue
      const df = DF.get(t)!
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
      score += idf * ((f * 2.2) / (f + 1.2 * (0.25 + (0.75 * d.len) / AVG)))
    }
    return { passage: d.p, score, i }
  })
  return hits
    .filter((h) => h.score >= minScore)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, k)
    .map(({ passage, score }) => ({ passage, score }))
}

export function passageById(id: string): Passage | undefined {
  return KNOWLEDGE.find((p) => p.id === id)
}
