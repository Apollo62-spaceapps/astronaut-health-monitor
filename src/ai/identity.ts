// Identidade do copiloto (L7). Nome num lugar só: o nome do sistema ainda é P-11.
// Não usar "Orion" (nave da NASA) nem nome de marca.
export const ASSISTANT_NAME = 'Orbit'
export const ASSISTANT_TAGLINE = 'Onboard health copilot · works offline'
export const ASSISTANT_INTRO = `I'm ${ASSISTANT_NAME}. I read your data, explain it, and help you decide when to call the CMO. I never change your alerts.`
export const ASSISTANT_LIMITS = [
  'I never change a status, an alert or the escalation: the rule engine decides.',
  'I never name a condition, guess a cause or suggest medication.',
  'I only suggest safe actions: re-measure, notify the CMO, follow the onboard medical checklist.',
] as const
export const THINKING_TEXT = 'Reading your data…'
export const TRIAGE_DISCLAIMER = "I can't tell you what this is. Here is what I can do."
export const EMERGENCY_TEXT = 'This needs a person now. Notify the CMO and follow the onboard medical checklist.'
export const WITHIN_REFERENCE = 'Within your personal reference today.'
export const PACKET_ORIGIN = 'Drafted by Orbit, confirmed by you'
export const OUTLOOK_DISCLAIMER = 'Risk outlook — not a prediction or diagnosis. Illustrative thresholds.'
export const REFERENCE_DISCLAIMER = 'Personal reference — not a health judgment. Illustrative thresholds.'
/** Selo do modo WebLLM (AI-06). Em protocolo a resposta é regra, não "AI-generated". */
export const RULE_BASED_LABEL = 'Rule-based response · Protocol mode'
