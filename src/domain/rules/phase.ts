// R-PHASE-01 (SPEC §7, BODY-09, P1): dias desde a troca de gravidade + status → "Adapting".
// Regra de segurança: "Adapting" só substitui ATTENTION. Urgent nunca é mascarado.
// Base: a troca de gravidade afeta orientação, equilíbrio e coordenação (S19); o enjoo da adaptação
// dura em média 3 dias (S04). As janelas dos outros indicadores estão pendentes (P-14).
// Função PURA.
import type { BodyZone, MissionMode, ZoneStatus } from '@/domain/types'
import { ENVIRONMENTS } from '@/domain/config/environments'

/** Janela de adaptação em dias [S04: média de 3 dias para o enjoo da adaptação]. Outras janelas: P-14. */
export const ADAPTATION_WINDOW_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

/** Houve troca de campo gravitacional entre dois ambientes? (ex.: Spacecraft → Moon, Spacecraft → Earth) */
export function gravityChanged(from: MissionMode, to: MissionMode): boolean {
  return ENVIRONMENTS[from].gravity !== ENVIRONMENTS[to].gravity
}

/** Ainda dentro da janela de adaptação? */
export function inAdaptation(
  changeIso: string | null | undefined,
  nowIso: string,
  windowDays = ADAPTATION_WINDOW_DAYS,
): boolean {
  if (!changeIso) return false
  const elapsed = Date.parse(nowIso) - Date.parse(changeIso)
  return elapsed >= 0 && elapsed < windowDays * DAY_MS
}

/**
 * R-PHASE-01: só zonas ligadas ao hazard "gravity" (Heart, Legs) e só quando o status é attention.
 * Normal, urgent, restricted e "sem dado" passam sem mudança.
 */
export function applyPhase(
  status: ZoneStatus | null,
  zone: Pick<BodyZone, 'hazard'>,
  changeIso: string | null | undefined,
  nowIso: string,
): ZoneStatus | null {
  if (status !== 'attention' || zone.hazard !== 'gravity') return status
  return inAdaptation(changeIso, nowIso) ? 'adapting' : status
}
