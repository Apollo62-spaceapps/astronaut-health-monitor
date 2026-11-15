// L7 §13: classificador determinístico do Orbit.
import { describe, expect, it } from 'vitest'
import { classify, isEmergency } from '@/ai/intent'

describe('intent.ts (Orbit)', () => {
  it.each([
    ['How am I doing today?', 'status'],
    ['What should I do now?', 'whatNow'],
    ['Why is my heart zone attention?', 'zoneExplain'],
    ['Why is this alert active?', 'zoneExplain'],
    ['What do I do about the solar event?', 'solarEvent'],
    ['How long until the ground replies?', 'groundDelay'],
    ["What's due?", 'routine'],
    ['Remind me of my measurements', 'routine'],
    ['Prepare a message for the CMO', 'prepareReport'],
    ['What can you see?', 'privacy'],
    ['Who is at higher risk?', 'riskOutlook'],
    ['Why is Crew B guarded?', 'riskOutlook'],
    ['What is my baseline?', 'reference'],
    ['Why is my reference different on the Moon?', 'reference'],
    ['Am I drifting from my baseline?', 'drift'],
    ['What are you?', 'about'],
    ['banana', 'general'],
  ])('"%s" → %s', (text, intent) => {
    expect(classify(text).intent).toBe(intent)
  })

  it('sinônimos de triagem', () => {
    for (const t of ['I feel dizzy', 'I have a headache', "I'm so tired", "I can't sleep", 'my chest feels odd'])
      expect(classify(t).intent, t).toBe('triage')
  })

  it('emergência: dor no peito, falta de ar, desmaio', () => {
    for (const t of ['I have chest pain', "I can't breathe", 'short of breath', 'I fainted', 'I passed out', "It's hard to breathe", 'hard to breathe', 'trouble breathing']) {
      expect(isEmergency(t), t).toBe(true)
      expect(classify(t)).toMatchObject({ intent: 'triage', emergency: true })
    }
    expect(isEmergency('I feel dizzy')).toBe(false)
  })

  it('zona e tripulante citados', () => {
    expect(classify('Why is my heart zone attention?').zone).toBe('heart')
    expect(classify('Why is Crew B guarded?').crewId).toBe('B')
  })

  it('empate ⇒ whatNow; mesma entrada ⇒ mesma saída', () => {
    expect(classify('help me with status')).toEqual(classify('help me with status'))
    expect(classify('').intent).toBe('general')
  })

  it('saudação com pergunta responde a pergunta; saudação sozinha é smalltalk', () => {
    expect(classify('thanks').intent).toBe('smalltalk')
    expect(classify('hi').intent).toBe('smalltalk')
    expect(classify("thanks, what's my heart rate?").intent).not.toBe('smalltalk')
    expect(classify('hi, how am I doing?').intent).toBe('status')
    // Sem pergunta, continua smalltalk (não abre a triagem nem responde outro assunto).
    for (const t of ['thanks, I feel better', 'thanks for the report', 'ok, thanks for today', 'thanks, my heart is fine'])
      expect(classify(t).intent, t).toBe('smalltalk')
  })

  it('erro de digitação junto com "hard to" não perde a emergência', () => {
    expect(isEmergency('hard to breth')).toBe(true)
  })
})
