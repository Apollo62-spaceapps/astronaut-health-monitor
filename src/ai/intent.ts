// Classificador de intenção do Orbit (L7 §5). DETERMINÍSTICO: pontuação por palavras-chave (inglês), sem LLM.
// Mesma entrada ⇒ mesma saída. Empate ⇒ whatNow. Menção a dor no peito, falta de ar ou desmaio ⇒ emergência
// (BODY-10/P-12: sem fluxo clínico, só "precisa de uma pessoa agora").
import type { ZoneTarget, Intent } from '@/ai/schema'

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

export const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function isEmergency(text: string): boolean {
  const t = normalize(text)
  return EMERGENCY.some((re) => re.test(t))
}

export function zoneIn(text: string): ZoneTarget | undefined {
  const t = normalize(text)
  return ZONE_WORDS.find(([, re]) => re.test(t))?.[0]
}

export function classify(text: string): Classified {
  const t = normalize(text)
  const crewId = /\bcrew ([a-d])\b/.exec(t)?.[1]?.toUpperCase()
  const zone = zoneIn(t)
  if (isEmergency(t)) return { intent: 'triage', zone, emergency: true }
  if (!t) return { intent: 'general', emergency: false }

  const scores = new Map<Intent, number>()
  for (const [intent, words] of Object.entries(KEYWORDS) as [Intent, string[]][]) {
    const weight = (w: string) => (GENERIC.includes(intent) ? w.split(' ').length / 2 : w.split(' ').length + 2)
    const score = words.reduce((s, w) => s + (t.includes(w) ? weight(w) : 0), 0)
    if (score > 0) scores.set(intent, score)
  }
  // Pergunta sobre um tripulante citado é do outlook.
  if (crewId) scores.set('riskOutlook', (scores.get('riskOutlook') ?? 0) + 2)
  // "why is my heart zone attention" → zoneExplain quando cita uma zona.
  if (zone && /\bwhy\b/.test(t)) scores.set('zoneExplain', (scores.get('zoneExplain') ?? 0) + 2)

  if (scores.size === 0) return { intent: 'general', zone, crewId, emergency: false }
  const best = Math.max(...scores.values())
  const tied = [...scores.entries()].filter(([, s]) => s === best).map(([i]) => i)
  const intent = tied.length === 1 ? tied[0]! : 'whatNow'
  return { intent, zone, crewId, emergency: false }
}
