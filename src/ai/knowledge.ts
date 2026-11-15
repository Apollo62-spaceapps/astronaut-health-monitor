// Base de conhecimento LOCAL do Orbit (Edge RAG, L7b). Roda 100% offline, sem rede e sem modelo.
// Cada passagem resume só o que o projeto já afirma com fonte do catálogo (src/data/sources.ts, CLAUDE.md §0.5):
// nada de limiar clínico novo, conduta, doença ou dose. A recuperação é BM25 sobre título + texto + palavras-chave.
// O Orbit cita a fonte de cada passagem usada ([Sxx]) e diz quando não tem fonte ("I won't guess").
import type { SourceId } from '@/domain/types'
import { fixTypos, toEnglish } from '@/ai/lang'

export interface Passage {
  id: string
  /** 'nasa' = resume uma fonte do catálogo; 'app' = explica como este protótipo funciona (sem fonte externa). */
  kind?: 'nasa' | 'app'
  title: string
  text: string
  sourceIds: SourceId[]
  /** Termos extras para a busca (sinônimos em inglês). */
  keywords: string[]
}

const CORE: Passage[] = [
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
    sourceIds: ['S19'],
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
      'shield',
      'shielding',
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
    kind: 'app',
    title: 'Communication delay to the Moon',
    text: 'The Moon is about 384,400 km away, so a radio signal takes about 1.3 seconds each way, and a reply about 2.6 seconds (physical calculation: average Earth–Moon distance ÷ speed of light).',
    sourceIds: [],
    keywords: ['moon', 'lunar', 'delay', 'seconds', 'distance', 'reply', 'communication'],
  },
  {
    id: 'cmo-role',
    title: 'The crew medical officer',
    text: 'NASA standards call for at least two crew medical officers per vehicle, and keep medical communications private.',
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
    // Descreve a lógica do próprio app (decisão do time, P-01), não um achado da S23: por isso kind 'app' e sem fonte.
    id: 'personal-reference',
    kind: 'app',
    title: 'How this app reads your numbers',
    text: 'Each reading is compared with the astronaut’s own pre-flight exam, not with a population range. After a gravity change the reference is rebuilt from readings in the new environment; back on Earth it is compared with the pre-flight exam again. The thresholds are illustrative until the team sources them.',
    sourceIds: [],
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

/** Mais fatos com fonte do catálogo (L8). Cada um repete só o que a SPEC/CLAUDE.md já atribui à fonte. */
const MORE_NASA: Passage[] = [
  {
    id: 'cmo-not-physician',
    title: 'Who the crew medical officer is',
    text: 'The crew medical officer is a crew member assigned to medical duties: often a physician, but not necessarily.',
    sourceIds: ['S02'],
    keywords: ['cmo', 'medical', 'officer', 'physician', 'doctor', 'who', 'crew', 'two'],
  },
  {
    id: 'private-conference',
    title: 'Private medical conferences',
    text: 'NASA schedules private medical conferences between each astronaut and the crew surgeon, and treats medical communications as private under the Privacy Act of 1974.',
    sourceIds: ['S04', 'S02'],
    keywords: ['private', 'conference', 'privacy', 'confidential', 'talk', 'surgeon', 'act', 'mental'],
  },
  {
    id: 'ascr',
    title: 'Who sets the exercise plan',
    text: 'Exercise plans are set by the astronaut strength, conditioning and rehabilitation specialists (ASCRs). This app never sets or changes a training plan; it only logs what was done.',
    sourceIds: ['S04'],
    keywords: ['ascr', 'exercise', 'plan', 'prescribe', 'training', 'coach', 'workout', 'program'],
  },
  {
    id: 'exercise-partners',
    title: 'Motivation for exercise',
    text: 'NASA mentions software-generated exercise partners as a way to keep crews motivated on long missions. The app uses a professional streak and a few achievements for the same reason.',
    sourceIds: ['S19'],
    keywords: ['motivation', 'gamification', 'streak', 'achievement', 'partner', 'engagement', 'exercise', 'game'],
  },
  {
    id: 'donki-details',
    title: 'The May 2024 solar particle event',
    text: 'The replayed event, 2024-05-11T02:10:00-SEP-001, was measured by the GOES-P SEISS instrument above 100 MeV and is linked in DONKI to a solar flare at 01:10 UTC and a coronal mass ejection at 01:36 UTC.',
    sourceIds: ['S07'],
    keywords: ['solar', 'flare', 'cme', 'coronal', 'goes', 'seiss', 'mev', 'event', 'may', '2024', 'proton'],
  },
  {
    id: 'donki-terms',
    title: 'DONKI data use',
    text: 'DONKI is the NASA space weather database from the Community Coordinated Modeling Center. Its data are prototype quality, used with acknowledgement and without endorsement.',
    sourceIds: ['S06'],
    keywords: ['donki', 'ccmc', 'database', 'space', 'weather', 'terms', 'acknowledgement'],
  },
  {
    id: 'mars-22min',
    title: 'Delay near Mars',
    text: 'Near Mars, a message can take about 22 minutes each way, and crews should expect a blackout of about three weeks around solar conjunction. Over a whole mission the one-way delay varies from almost zero to about 22 minutes.',
    sourceIds: ['S11', 'S20'],
    keywords: ['mars', 'delay', 'blackout', 'conjunction', 'minutes', 'weeks', 'communication', 'latency'],
  },
  {
    id: 'challenge',
    title: 'What the challenge asks for',
    text: 'The Space Apps challenge asks for a visual self-assessment tool for astronauts: indicators such as blood pressure, heart rate, glucose, temperature, sleep and mood, a body map, charts over time, color coding, routine reminders and support for several environments.',
    sourceIds: ['S01'],
    keywords: ['challenge', 'space', 'apps', 'brief', 'requirements', 'purpose', 'built', 'project', 'goal'],
  },
  {
    id: 'google-nasa-ai',
    title: 'AI for medical care in space',
    text: 'Google and NASA have publicly described testing AI to support medical care in space. Orbit follows the same idea of crew support, but runs entirely onboard and never decides on its own.',
    sourceIds: ['S15'],
    keywords: ['ai', 'artificial', 'intelligence', 'google', 'medical', 'care', 'model', 'assistant'],
  },
  {
    id: 'webllm',
    title: 'Language model in the browser',
    text: 'WebLLM runs small language models directly in the browser on the GPU, with no server. Orbit can use one to rephrase its answers; facts, alerts and actions still come from the rules.',
    sourceIds: ['S17'],
    keywords: ['webllm', 'llm', 'language', 'model', 'gpu', 'browser', 'slm', 'onboard'],
  },
  {
    id: 'iec62304',
    title: 'Engineering practice',
    text: 'The team followed engineering practices inspired by IEC 62304, the standard for medical device software life cycles. No compliance is claimed: this is a prototype.',
    sourceIds: ['S16'],
    keywords: ['standard', 'iec', '62304', 'software', 'engineering', 'quality', 'regulation', 'compliance'],
  },
  {
    id: 'ssm-actigraphy',
    title: 'How NASA measures sleep in flight',
    text: 'In the Standard Measures, astronauts wear an actigraph on the non-dominant wrist that records activity and light, and answer short questionnaires on the onboard device after waking (sleep quality and quantity) and before sleeping (mood, team cohesion, habitability).',
    sourceIds: ['S22', 'S23'],
    keywords: ['sleep', 'actigraph', 'actigraphy', 'wrist', 'questionnaire', 'mood', 'cohesion', 'tracker', 'wearable'],
  },
  {
    id: 'ssm-crew-time',
    title: 'Crew time for the Standard Measures',
    text: 'For a six-month mission, the Standard Measures take about 27 hours of crew time in total: roughly 7 before flight, 15 in flight and 5 after.',
    sourceIds: ['S23'],
    keywords: ['crew', 'time', 'hours', 'standard', 'measures', 'cost', 'workload'],
  },
  {
    id: 'ssm-cognition',
    title: 'Cognitive tests',
    text: 'The Standard Measures include a battery of ten brief cognitive tests, covering things like memory and decision-making under risk. In this prototype a cognitive check is future work.',
    sourceIds: ['S23'],
    keywords: ['cognitive', 'cognition', 'memory', 'test', 'tests', 'brain', 'decision', 'focus'],
  },
  {
    id: 'ssm-sensorimotor',
    title: 'Balance and blood pressure after landing',
    text: 'Sensorimotor tests in the Standard Measures check movement and balance, plus heart rate and blood pressure, before flight and right after landing, for example during a sit-to-stand test and a tandem walk.',
    sourceIds: ['S23'],
    keywords: ['balance', 'landing', 'walk', 'sensorimotor', 'stand', 'return', 'readaptation', 'earth'],
  },
  {
    id: 'analogs-more',
    title: 'Other analog studies',
    text: 'Besides HERA, analog studies include NEK in Moscow with six people for eight months, and :envihab in Cologne with twelve people in bed rest campaigns of 30 to 60 days.',
    sourceIds: ['S26'],
    keywords: ['analog', 'nek', 'envihab', 'bed', 'rest', 'isolation', 'study', 'moscow', 'cologne'],
  },
  {
    id: 'data-access',
    title: 'Why the data here are simulated',
    text: 'Individual astronaut data from the Standard Measures are kept in an archive managed by the Human Research Program and shared only under data agreements and approved protocols. That is why every person in this prototype is synthetic and labeled SIMULATED.',
    sourceIds: ['S23', 'S26'],
    keywords: ['data', 'real', 'simulated', 'synthetic', 'archive', 'access', 'fake', 'where'],
  },
]

/** Como este protótipo funciona (sem fonte externa: descreve o próprio app). */
const APP: Passage[] = [
  {
    id: 'app-environments',
    kind: 'app',
    title: 'Four environments, one system',
    text: 'The mode button switches the whole platform between Earth, Space Station, Moon and Spacecraft. It changes the mission banner and background, the delay to the ground and the escalation, the gravity phase, the radiation dose rate when it has a source, the exercise context and the hazards in focus.',
    sourceIds: [],
    keywords: ['environment', 'mode', 'switch', 'earth', 'station', 'moon', 'spacecraft', 'button', 'multienvironment'],
  },
  {
    id: 'app-body-map',
    kind: 'app',
    title: 'The body map',
    text: 'The body map has six zones: head (mood and sleep, private), heart (resting heart rate and blood pressure), torso (glucose), skin (temperature), arms and legs (exercise adherence), with radiation as a whole-body ring. Each zone takes its color from the rule engine; select one to see what it measures and why.',
    sourceIds: [],
    keywords: ['body', 'map', 'zone', 'zones', 'head', 'torso', 'skin', 'arms', 'legs', 'figure'],
  },
  {
    id: 'app-statuses',
    kind: 'app',
    title: 'What the colors mean',
    text: 'Every status is color plus icon plus text: ✓ Normal, ▲ Attention, ● Urgent (with hatching), ◼ Restricted for private data and ↻ Adapting after a gravity change. Color never appears alone, so the screen reads the same under stress or with color blindness.',
    sourceIds: [],
    keywords: ['color', 'colors', 'status', 'green', 'yellow', 'red', 'normal', 'attention', 'urgent', 'meaning', 'icon', 'legend'],
  },
  {
    id: 'app-thresholds',
    kind: 'app',
    title: 'Illustrative thresholds',
    text: 'A reading turns Attention or Urgent when it moves a set percentage away from the person’s own pre-flight reference; for resting heart rate that is 10% and 25%. These numbers are illustrative placeholders until the team sources clinical thresholds, and the screen says so.',
    sourceIds: [],
    keywords: ['threshold', 'thresholds', 'limit', 'percent', 'illustrative', 'cutoff', 'trigger'],
  },
  {
    id: 'app-escalation',
    kind: 'app',
    title: 'How escalation works',
    text: 'Normal escalates to no one. Attention notifies the CMO and queues a message for the ground; Urgent does the same as a priority message. On Earth the flight surgeon is reached directly. The reply time shown is twice the one-way delay of the environment.',
    sourceIds: [],
    keywords: ['escalation', 'escalate', 'notify', 'priority', 'queue', 'contacted'],
  },
  {
    id: 'app-store-forward',
    kind: 'app',
    title: 'Messages to the ground',
    text: 'Messages to Earth are store-and-forward: they wait in a queue and go when the link allows, so the crew acts first and the ground reviews later. Orbit can draft a message, but nothing is sent until the astronaut confirms.',
    sourceIds: [],
    keywords: ['message', 'queue', 'store', 'forward', 'send', 'outbox', 'packet'],
  },
  {
    id: 'app-privacy',
    kind: 'app',
    title: 'Who sees what',
    text: 'Mood and sleep belong to the astronaut. The CMO sees vitals, radiation and exercise; with the astronaut’s consent only the level of a wellbeing alert, never the details. Emergency access needs a reason and is written to an audit log. The flight surgeon sees everything.',
    sourceIds: [],
    keywords: ['privacy', 'private', 'see', 'consent', 'break-glass', 'audit', 'access'],
  },
  {
    id: 'app-provenance',
    kind: 'app',
    title: 'REAL and SIMULATED labels',
    text: 'Every number carries a label: REAL when it comes from a public NASA source, such as the DONKI solar event or the 600 mSv limit, and SIMULATED when it is synthetic demo data. Clicking a label opens its source.',
    sourceIds: [],
    keywords: ['real', 'simulated', 'label', 'badge', 'provenance', 'trust'],
  },
  {
    id: 'app-routine',
    kind: 'app',
    title: 'Routine and reminders',
    text: 'Each environment has its own daily routine: morning vitals, a wellbeing check-in, exercise and, on the Space Station, maintenance of the Spacecraft. When an item is due, a reminder appears in the mission banner with Log measurement. Routine states are Due, Overdue, Done and Postponed, in neutral colors so they are never confused with health status.',
    sourceIds: [],
    keywords: ['routine', 'reminder', 'schedule', 'due', 'overdue', 'agenda', 'task', 'daily'],
  },
  {
    id: 'app-checkin',
    kind: 'app',
    title: 'Daily check-in',
    text: 'The daily check-in collects mood from 1 to 5, hours of sleep and the five vitals in one form. It is self-report, not a clinical assessment. The plan is to connect biosensors later so most of it fills itself.',
    sourceIds: [],
    keywords: ['checkin', 'check-in', 'form', 'daily', 'input', 'biosensor', 'sensor', 'sensors', 'wearable'],
  },
  {
    id: 'app-shelter-flow',
    kind: 'app',
    title: 'What happens during a solar event',
    text: 'When a solar particle event is active, the radiation ring turns Urgent, the banner shows the shelter alert, the shelter steps become the main action and the routine and exercise are postponed until the shelter ends.',
    sourceIds: [],
    keywords: ['solar', 'event', 'shelter', 'happens', 'postponed', 'flow'],
  },
  {
    id: 'app-outlook',
    kind: 'app',
    title: 'Crew outlook levels',
    text: 'The crew outlook rates each crew member Low, Guarded, Elevated or High from observed factors such as heart rate against reference, drift, sleep, mood, dose, a solar event, exercise and the delay to Earth. Urgent readings are never hidden and Adapting does not raise it. It is an outlook, not a prediction.',
    sourceIds: [],
    keywords: ['outlook', 'risk', 'level', 'guarded', 'elevated', 'high', 'low', 'factors', 'drivers'],
  },
  {
    id: 'app-drift',
    kind: 'app',
    title: 'Drift detection',
    text: 'If a vital moves in the same direction for three days in a row, away from the reference, Orbit flags a trend even before any threshold is crossed. A trend is a preventive notice: never urgent and never a cause.',
    sourceIds: [],
    keywords: ['drift', 'trend', 'early', 'warning', 'creeping', 'prevent', 'preventive'],
  },
  {
    id: 'app-report',
    kind: 'app',
    title: 'The ground report',
    text: 'The ground report gathers alerts, every vital against the reference, trends, radiation, exercise, wellbeing if the astronaut includes it, the routine and what was already done, with sources, in a few kilobytes of plain text for a low-bandwidth window.',
    sourceIds: [],
    keywords: ['report', 'doctor', 'export', 'document', 'summary', 'bandwidth', 'kilobytes'],
  },
  {
    id: 'app-orbit',
    kind: 'app',
    title: 'How Orbit works',
    text: 'Orbit has three layers, all onboard: rules decide every color, alert and escalation; a local library of NASA-sourced passages lets it explain and cite; an optional on-device model can only rephrase. It never changes an alert, never names a condition and always leaves the decision to the crew.',
    sourceIds: [],
    keywords: ['orbit', 'ai', 'architecture', 'rag', 'rules', 'layers', 'hallucination', 'hallucinate', 'trust', 'copilot', 'assistant'],
  },
  {
    id: 'app-offline',
    kind: 'app',
    title: 'Works without Earth',
    text: 'After the first load everything runs locally in the browser: the rules, the charts, Orbit and its library. Only the optional on-device model needs a one-time download. A communication blackout does not stop the app.',
    sourceIds: [],
    keywords: ['offline', 'internet', 'connection', 'local', 'network', 'without', 'available'],
  },
  {
    id: 'app-gravity-phase',
    kind: 'app',
    title: 'Adapting after a gravity change',
    text: 'Moving between gravity fields, such as Spacecraft to Moon or back to Earth, starts an adaptation window. During it, heart and leg readings that would be Attention show as Adapting; Urgent always stays Urgent.',
    sourceIds: [],
    keywords: ['adapting', 'gravity', 'window', 'landing', 'return', 'phase'],
  },
  {
    id: 'app-demo',
    kind: 'app',
    title: 'Demo controls',
    text: 'The dashed Demo button holds controls that are not part of the product: replay the real solar event, end the shelter, simulate an abnormal heart rate, speed up time and reset the scenario.',
    sourceIds: [],
    keywords: ['demo', 'controls', 'reset', 'replay', 'simulate', 'scenario'],
  },
]

export const KNOWLEDGE: readonly Passage[] = [...CORE, ...MORE_NASA, ...APP]

const STOP = new Set(
  'a an the and or of to in on at for is are was were be been my me i you your it this that what why how when where who do does did can could should would will with from about as by there their them they than then so if not no yes am work works working tell explain mean'.split(
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

/** Vocabulário do índice (para corrigir erro de digitação na busca). */
const VOCAB: ReadonlySet<string> = new Set(
  KNOWLEDGE.flatMap((p) => [p.title, p.text, ...p.keywords])
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length >= 4),
)

export interface Hit {
  passage: Passage
  score: number
}

/** BM25 (k1 = 1,2; b = 0,75). Determinístico: empate → ordem do catálogo. */
export function retrieve(query: string, k = 3, minScore = 1.2): Hit[] {
  // Português e erro de digitação viram termos do índice antes da busca (L8).
  const q = [...new Set(tokenize(fixTypos(toEnglish(query), VOCAB, 5)))]
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
