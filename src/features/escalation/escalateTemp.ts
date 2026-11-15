// Antes era a função temporária de R-ESC-01; agora só reexporta a regra real (L2 #53).
// Mantido para não quebrar os imports da tela de comunicação (K6).
export { escalate, type EscalationDecision } from '@/domain/rules/escalation'
