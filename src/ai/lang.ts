// Camada de linguagem do Orbit (L8): entende perguntas em português e com erro de digitação.
// A INTERFACE e as respostas continuam em inglês (CLAUDE.md §0.11); só a ENTRADA é normalizada, porque a banca
// ou a tripulação podem digitar em português. Determinístico e offline.

/** Minúsculas, sem acento, aspas e espaços normalizados. */
export function plain(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Expressões em português (sem acento) → inglês. Ordem importa: as mais longas primeiro. */
const PT: [RegExp, string][] = [
  // emergência (antes de "dor" e "respirar")
  [/\bdor no peito\b/g, 'chest pain'],
  [/\b(falta de ar|nao consigo respirar|dificuldade (de|para) respirar)\b/g, "can't breathe"],
  [/\b(desmaiei|desmaio|desmaiar|desmaiou)\b/g, 'fainted'],
  // perguntas inteiras
  [/\bcomo (eu )?(estou|to|esta minha saude|estao meus dados|estou hoje)\b/g, 'how am i doing'],
  [/\bo que (eu )?(devo|preciso|tenho que) fazer( agora)?\b/g, 'what should i do now'],
  [/\bo que (eu )?faco( agora)?\b/g, 'what should i do now'],
  [/\b(quanto tempo|em quanto tempo)\b/g, 'how long'],
  [/\b(o que voce (pode )?ve|o que voce consegue ver|quem pode ver)\b/g, 'what can you see'],
  [/\b(quem e voce|o que e voce|o que voce e|quem voce e)\b/g, 'who are you'],
  [/\b(o que muda|o que mudaria|e se eu estivesse|e se eu for)\b/g, 'what changes'],
  [/\bquanto (eu )?dormi\b/g, 'how much did i sleep'],
  [/\bqual (e |eh )?(a |o )?(minha|meu)\b/g, "what's my"],
  [/\b(mensagem para o cmo|avisar o cmo|notificar o cmo|falar com o cmo)\b/g, 'message for the cmo'],
  [/\bnao consigo dormir\b/g, "can't sleep"],
  [/\b(me sinto|estou sentindo|to sentindo|sinto)\b/g, 'i feel'],
  [/\b(ultimos|ultimas) (7|sete) dias\b/g, 'last 7 days'],
  [/\b(por que|porque|pq|por quê)\b/g, 'why'],
  [/\b(me explica|explique|explica)\b/g, 'explain'],
  // indicadores e corpo
  [/\bpressao( arterial)?\b/g, 'blood pressure'],
  [/\b(frequencia cardiaca|batimentos?( cardiacos?)?|pulso)\b/g, 'heart rate'],
  [/\bcoracao\b/g, 'heart'],
  [/\b(glicemia|glicose|acucar no sangue|acucar)\b/g, 'glucose'],
  [/\b(temperatura|febre)\b/g, 'temperature'],
  [/\b(sono|dormir|dormi)\b/g, 'sleep'],
  [/\bhumor\b/g, 'mood'],
  [/\b(dor de cabeca)\b/g, 'headache'],
  [/\b(tontura|tonto|tonta)\b/g, 'dizzy'],
  [/\b(cansado|cansada|cansaco|exausto|exausta)\b/g, 'tired'],
  [/\b(enjoo|enjoado|enjoada|nausea)\b/g, 'nausea'],
  [/\bdor\b/g, 'pain'],
  [/\bcabeca\b/g, 'head'],
  [/\bpele\b/g, 'skin'],
  [/\b(pernas?)\b/g, 'legs'],
  [/\b(bracos?)\b/g, 'arms'],
  [/\b(ossos?)\b/g, 'bones'],
  [/\b(musculos?)\b/g, 'muscles'],
  // radiação e espaço
  [/\b(tempestade solar|evento solar|erupcao solar|particulas solares)\b/g, 'solar event'],
  [/\bradiacao\b/g, 'radiation'],
  [/\babrigo\b/g, 'shelter'],
  [/\b(exercicios?|treinos?|atividade fisica|malhar)\b/g, 'exercise'],
  [/\b(estacao espacial|estacao)\b/g, 'station'],
  [/\b(espaconave|nave espacial|nave)\b/g, 'spacecraft'],
  [/\blua\b/g, 'moon'],
  [/\bmarte\b/g, 'mars'],
  [/\bterra\b/g, 'earth'],
  [/\b(atraso|demora|latencia)\b/g, 'delay'],
  [/\bresposta\b/g, 'reply'],
  [/\bsolo\b/g, 'ground'],
  [/\b(cirurgiao de voo)\b/g, 'flight surgeon'],
  [/\b(medico|medica|doutor|doutora)\b/g, 'doctor'],
  [/\brelatorio\b/g, 'report'],
  [/\bexportar\b/g, 'export'],
  [/\bdocumento\b/g, 'document'],
  [/\brisco\b/g, 'risk'],
  [/\b(tripulacao|equipe)\b/g, 'crew'],
  [/\b(linha de base|referencia|meu normal)\b/g, 'baseline'],
  [/\btendencia\b/g, 'trend'],
  [/\bsubindo\b/g, 'going up'],
  [/\bdescendo\b/g, 'going down'],
  [/\bprivacidade\b/g, 'privacy'],
  [/\b(rotina|agenda)\b/g, 'routine'],
  [/\blembrete\b/g, 'remind'],
  [/\b(medicao|medicoes|medir)\b/g, 'measurement'],
  [/\b(obrigad[oa]|valeu|brigad[oa])\b/g, 'thanks'],
  [/\b(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/g, 'hi'],
  [/\bontem\b/g, 'yesterday'],
  [/\bhoje\b/g, 'today'],
  [/\bsemana\b/g, 'week'],
  [/\bmedia\b/g, 'average'],
  [/\b(meus|minhas|meu|minha)\b/g, 'my'],
]

/** Português (ou misturado) → inglês, para o classificador e a busca. Inglês passa sem mudança relevante. */
export function toEnglish(text: string): string {
  let t = plain(text)
  for (const [re, en] of PT) t = t.replace(re, en)
  return t
}

/** Palavras comuns do inglês que nunca são "corrigidas" (senão "does" viraria "dose"). */
const COMMON = new Set(
  'what does have this that with from your about today would could should there their when where which will been were they them then than much many more some very just also into over after before done make need help want know feel tell show give take right said says like good well only even back here same each both such most other these those while still need keep work works mean means time last next week days ever never always does doing doesn even than less once whom whose why how able away cant dont wont isnt arent wasnt didnt hard trouble breathe breathing'.split(
    ' ',
  ),
)

/** Distância de edição limitada (para corrigir erro de digitação). */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      cur.push(v)
      rowMin = Math.min(rowMin, v)
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]!
}

/**
 * Corrige palavras desconhecidas pela mais próxima do vocabulário ("presure" → "pressure").
 * Só palavras com 5+ letras; 1 edição até 7 letras, 2 a partir de 8.
 */
export function fixTypos(text: string, vocab: ReadonlySet<string>, minLen = 4): string {
  return text
    .split(' ')
    .map((w) => {
      const word = w.replace(/[^a-z0-9'-]/g, '')
      if (word.length < minLen || vocab.has(word) || COMMON.has(word)) return w
      const max = word.length >= 8 ? 2 : 1
      let best: string | null = null
      let bestD = max + 1
      for (const v of vocab) {
        if (Math.abs(v.length - word.length) > max) continue
        const d = editDistance(word, v, max)
        if (d < bestD) {
          bestD = d
          best = v
        }
      }
      return best && bestD <= max ? w.replace(word, best) : w
    })
    .join(' ')
}
