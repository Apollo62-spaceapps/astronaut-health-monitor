// Classificador de intenção do Orbit (L7 §5). DETERMINÍSTICO: pontuação por palavras-chave (inglês), sem LLM.
// Mesma entrada ⇒ mesma saída. Empate ⇒ whatNow. Menção a dor no peito, falta de ar ou desmaio ⇒ emergência
// (BODY-10/P-12: sem fluxo clínico, só "precisa de uma pessoa agora").
import type { ZoneTarget, Intent } from '@/ai/schema'
import type { MissionMode } from '@/domain/types'
import { KNOWLEDGE } from '@/ai/knowledge'
import { fixTypos, toEnglish } from '@/ai/lang'

export interface Classified {
  intent: Intent
  zone?: ZoneTarget
  /** Id do tripulante citado ("Crew B" → "B"). */
  crewId?: string
  emergency: boolean
}

/** Sinais que pedem uma pessoa agora. Sem diagnóstico; só encaminha. */
const EMERGENCY = [
  /\bchest (pain|hurts?|pressure|tight\w*)\b/,
  /\bpain in (my )?chest\b/,
  /\b(can'?t|cannot|can not|hard to|trouble|difficult\w*|struggl\w* to) breath\w*\b/,
  /\bshort(ness)? of breath\b/,
  /\bbreathless\w*\b/,
  /\b(faint\w*|passed out|pass out|blacked out|unconscious|collaps\w*)\b/,
]

const KEYWORDS: Record<Exclude<Intent, 'general'>, string[]> = {
  status: ['how am i', 'doing', 'status', 'today', 'overview', 'summary', 'my data', 'my numbers', 'how are my'],
  whatNow: [
    'what should i do',
    'do now',
    'what now',
    'next step',
    'what do i do',
    'help me',
    'what can i do',
    'action',
  ],
  zoneExplain: [
    'zone',
    'why is this alert',
    'alert active',
    'explain',
    'attention',
    'urgent',
    'adapting',
    'restricted',
  ],
  solarEvent: ['solar', 'flare', 'particle', 'sep', 'shelter', 'storm', 'radiation event', 'donki'],
  groundDelay: [
    'ground',
    'reply',
    'delay',
    'houston',
    'how long',
    'earth reply',
    'blackout',
    'flight surgeon',
    'contact',
  ],
  routine: ['due', 'routine', 'measure', 'remind', 'schedule', 'check-in', 'checkin', 'agenda', 'measurements', 'log'],
  triage: [
    'dizzy',
    'headache',
    'head hurts',
    'nause',
    'tired',
    'fatigue',
    'exhausted',
    "can't sleep",
    'cannot sleep',
    'insomnia',
    'feel sick',
    'feel bad',
    'feel unwell',
    'pain',
    'hurts',
    'symptom',
    'i feel',
    'not feeling',
    'weak',
    'chest',
    'breath',
  ],
  // Relatório completo para os flight surgeons (pitch, passo 4). "report" conta nos dois; "ground report" desempata.
  groundReport: [
    'ground report',
    'full report',
    'report',
    'export',
    'document',
    'for the doctor',
    'for my doctor',
    'clinical summary',
    'download',
    'medical report',
  ],
  prepareReport: [
    'message for the cmo',
    'prepare',
    'report',
    'notify',
    'tell the cmo',
    'send to',
    'packet',
    'handoff',
    'hand off',
    'write to',
  ],
  privacy: [
    'what can you see',
    'privacy',
    'private',
    'who can see',
    'can the cmo see',
    'access',
    'break-glass',
    'break glass',
    'consent',
  ],
  riskOutlook: ['risk', 'outlook', 'crew', 'higher risk', 'guarded', 'elevated', 'driving'],
  reference: ['baseline', 'reference', 'my normal', 'usual range', 'where did my', 'pre-flight', 'preflight'],
  drift: ['drift', 'drifting', 'trend', 'creeping', 'slowly', 'going up', 'going down', 'rising', 'falling'],
  about: ['who are you', 'what are you', 'about you', 'your name', 'are you ai', 'how do you work'],
  // L8: valor de um indicador ("what's my blood pressure?", "how much did I sleep?"). Só conta com um indicador citado.
  metric: [
    'what is my',
    "what's my",
    'whats my',
    'what was my',
    'how much',
    'how many',
    'average',
    'yesterday',
    'last week',
    'last 7 days',
    'latest',
    'last reading',
    'history',
    'show me my',
    'value',
    'how high',
    'how low',
  ],
  // L8: comparar ambientes ("what changes on the Moon?"). Só conta com um ambiente citado.
  environment: [
    'what changes',
    'what about the',
    'what if i',
    'compare',
    'difference between',
    'if i were',
    'if i was',
    'on the moon',
    'on the station',
    'on the space station',
    'on the spacecraft',
    'on earth',
    'on mars',
    'in transit',
    'switch to',
    'move to',
    'going to the',
    'go to the',
  ],
  smalltalk: [],
}

/** Intenções genéricas pesam metade: uma palavra de assunto ("solar", "baseline") vence "what do I do". */
const GENERIC: readonly Intent[] = ['status', 'whatNow']

const ZONE_WORDS: [ZoneTarget, RegExp][] = [
  ['heart', /\b(heart|cardio\w*|pulse|blood pressure|bp)\b/],
  ['head', /\b(head|mood|sleep|mind)\b/],
  ['torso', /\b(torso|metabolic|glucose|sugar)\b/],
  ['skin', /\b(skin|temperature|temp)\b/],
  ['arms', /\b(arms?|hands?|shoulders?)\b/],
  ['legs', /\b(legs?|knees?|feet|bones?|muscles?)\b/],
  ['radiation', /\b(radiation|dose)\b/],
]

const basic = (text: string) =>
  toEnglish(text)
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Vocabulário para corrigir erro de digitação: palavras-chave, zonas e a base local. */
let VOCAB: Set<string> | null = null
function vocab(): Set<string> {
  if (VOCAB) return VOCAB
  const words = [
    ...Object.values(KEYWORDS).flat(),
    'heart rate blood pressure glucose temperature sleep mood dose radiation exercise adherence systolic diastolic',
    'earth station moon spacecraft mars transit shelter solar baseline reference trend outlook report doctor',
    ...KNOWLEDGE.flatMap((p) => [p.title, ...p.keywords]),
  ]
  VOCAB = new Set(
    words
      .join(' ')
      .toLowerCase()
      .split(/[^a-z0-9'-]+/)
      .filter((w) => w.length >= 4),
  )
  return VOCAB
}

/** Texto normalizado: português → inglês, sem acento, e erros de digitação corrigidos. */
export const normalize = (text: string) => fixTypos(basic(text), vocab())

const METRIC_WORDS =
  /\b(heart rate|pulse|bpm|blood pressure|bp|systolic|diastolic|glucose|sugar|temperature|temp|sleep|slept|mood|dose|radiation|exercise|adherence|workout)\b/
const SMALLTALK =
  /^(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you|thx|ok|okay|got it|cool|great|nice|perfect|bye|goodbye|see you)\b/
export const ENV_WORDS: [MissionMode, RegExp][] = [
  ['LUNAR', /\b(moon|lunar)\b/],
  ['ISS', /\b(space station|station|iss)\b/],
  ['SPACECRAFT', /\b(spacecraft|mars|transit|deep space)\b/],
  ['EARTH', /\b(earth|home)\b/],
]

/** Ambiente citado na pergunta ("on the Moon" → LUNAR). */
export function environmentIn(text: string): MissionMode | undefined {
  const t = normalize(text)
  return ENV_WORDS.find(([, re]) => re.test(t))?.[0]
}

/** Todas as intenções com pontuação, da maior para a menor (também usado nas perguntas compostas). */
export function classifyAll(text: string): [Intent, number][] {
  const t = normalize(text)
  const scores = new Map<Intent, number>()
  for (const [intent, words] of Object.entries(KEYWORDS) as [Intent, string[]][]) {
    const weight = (w: string) => (GENERIC.includes(intent) ? w.split(' ').length / 2 : w.split(' ').length + 2)
    const score = words.reduce((s, w) => s + (t.includes(w) ? weight(w) : 0), 0)
    if (score > 0) scores.set(intent, score)
  }
  // Valor de indicador só com um indicador citado: "what's my baseline?" não é métrica.
  if (scores.has('metric') && !METRIC_WORDS.test(t)) scores.delete('metric')
  // Comparar ambientes só com um ambiente citado; "baseline/reference" puxa para a referência.
  if (scores.has('environment') && !environmentIn(t)) scores.delete('environment')
  if (/\b(baseline|reference)\b/.test(t) && scores.has('reference') && !scores.has('drift')) scores.set('reference', scores.get('reference')! + 4)
  // Saudação só é smalltalk quando não há pergunta junto ("thanks, what's my heart rate?" é métrica).
  if (SMALLTALK.test(t) && t.split(' ').length <= 5 && scores.size === 0 && !zoneIn(t)) scores.set('smalltalk', 10)
  // Pergunta sobre um tripulante citado é do outlook.
  if (/\bcrew ([a-d])\b/.test(t)) scores.set('riskOutlook', (scores.get('riskOutlook') ?? 0) + 2)
  // "why is my heart zone attention" → zoneExplain quando cita uma zona.
  if (zoneIn(t) && /\bwhy\b/.test(t)) scores.set('zoneExplain', (scores.get('zoneExplain') ?? 0) + 2)
  return [...scores.entries()].sort((a, b) => b[1] - a[1])
}

/**
 * Testa o texto antes E depois da correção de digitação: a correção pode trocar uma palavra do sinal
 * de alarme ("hard to breathe" → "hand to breath") e a emergência nunca pode se perder por isso.
 */
export function isEmergency(text: string): boolean {
  const candidates = [basic(text), normalize(text)]
  return candidates.some((t) => EMERGENCY.some((re) => re.test(t)))
}

export function zoneIn(text: string): ZoneTarget | undefined {
  const t = normalize(text)
  return ZONE_WORDS.find(([, re]) => re.test(t))?.[0]
}

export function classify(text: string): Classified {
  const t = normalize(text)
  const crewId = /\bcrew ([a-d])\b/.exec(t)?.[1]?.toUpperCase()
  const zone = zoneIn(t)
  if (isEmergency(text)) return { intent: 'triage', zone, emergency: true }
  if (!t) return { intent: 'general', emergency: false }

  const scores = new Map(classifyAll(t))

  // Pergunta curta que só cita uma zona ("and my blood pressure?") é sobre essa zona.
  if (scores.size === 0 && zone && (t.split(' ').length <= 3 || /^(and|what about|how about)(?=[ ]|$)/.test(t)))
    return { intent: 'zoneExplain', zone, crewId, emergency: false }
  if (scores.size === 0) return { intent: 'general', zone, crewId, emergency: false }
  const best = Math.max(...scores.values())
  const tied = [...scores.entries()].filter(([, s]) => s === best).map(([i]) => i)
  const intent = tied.length === 1 ? tied[0]! : 'whatNow'
  return { intent, zone, crewId, emergency: false }
}

/** Pergunta de seguimento curta ("why?", "tell me more"): aprofunda a resposta anterior. */
export function isFollowUp(text: string): boolean {
  const t = normalize(text)
  if (!t || t.split(' ').length > 6) return false
  return /^(why|how come|tell me more|more|go on|explain( that| more| why)?|what does (that|this) mean|and why|why is that|why so|really|can you explain|details?|more details?|elaborate)(?=[ ]|$)/.test(
    t,
  )
}
