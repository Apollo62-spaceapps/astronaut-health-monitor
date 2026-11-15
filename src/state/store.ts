// Store único (Zustand) — contrato K2 #42. As telas leem daqui; as REGRAS (src/domain/rules, do Lucas)
// calculam status/alertas a partir destes dados. A LLM nunca escreve em `alerts` (AI-07).
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_ENVIRONMENT, groundReplySec } from '@/domain/config/environments'
import { demoScenario } from '@/data/scenario'
import type {
  AiMode,
  Alert,
  AuditEntry,
  ExerciseSession,
  MissionMode,
  OutboundPacket,
  RadiationState,
  Role,
  RoutineItem,
  RoutineStatus,
  SpaceWeatherEvent,
  VitalReading,
  WellbeingEntry,
} from '@/domain/types'

/** Dia 0 da missão (tempo simulado). O cenário da demo começa no dia 120 (SPEC §9). */
export const MISSION_START_ISO = '2026-07-17T00:00:00.000Z'
export const DEMO_MISSION_DAY = 120

const DAY_MS = 24 * 60 * 60 * 1000
export function missionDayToIso(day: number, hour = 8): string {
  return new Date(Date.parse(MISSION_START_ISO) + day * DAY_MS + hour * 60 * 60 * 1000).toISOString()
}

export interface ScenarioData {
  vitals: VitalReading[]
  /** Leituras do exame pré-voo (baseline). */
  preflight: VitalReading[]
  wellbeing: WellbeingEntry[]
  exercise: ExerciseSession[]
  routine: RoutineItem[]
  radiation: RadiationState
  /** Evento real do DONKI (K3) — só fica "ativo" depois do Replay. */
  spaceWeatherEvent: SpaceWeatherEvent | null
}

export interface AppState extends ScenarioData {
  // Modo e perfil (persistidos)
  environment: MissionMode
  role: Role
  aiMode: AiMode

  // Relógio simulado (nunca use Date.now() nas regras)
  missionDay: number
  simNowIso: string
  /** Multiplicador da aceleração de tempo da demo (DEMO-01, ROUT-05). 1 = tempo normal. */
  timeAcceleration: number

  // Alertas (escritos SÓ pelo motor de regras) e fila ao solo
  alerts: Alert[]
  outbox: OutboundPacket[]

  // Privacidade (§6.7)
  consent: { shareWellbeingAlertsWithCmo: boolean }
  breakGlass: { active: boolean; reason?: string; at?: string }
  auditLog: AuditEntry[]

  // Demo (§6.9)
  shelterActive: boolean
  eventReplayed: boolean

  // Ações
  setEnvironment: (mode: MissionMode) => void
  setRole: (role: Role) => void
  setAiMode: (mode: AiMode) => void
  setConsent: (share: boolean) => void
  /** Break-glass do CMO: motivo obrigatório; sempre gera AuditEntry (PRIV-03). */
  breakGlassAccess: (reason: string) => void
  endBreakGlass: () => void
  setAlerts: (alerts: Alert[]) => void
  addReading: (reading: VitalReading) => void
  setRoutineStatus: (id: string, status: RoutineStatus) => void
  enqueuePacket: (summary: string, priority?: OutboundPacket['priority']) => OutboundPacket
  setPacketStatus: (id: string, status: OutboundPacket['status']) => void
  setTimeAcceleration: (factor: number) => void
  advanceDay: (days?: number) => void
  advanceDemoMinutes: (minutes: number) => void
  replaySolarEvent: () => void
  endShelter: () => void
  loadScenario: (data: Partial<ScenarioData>) => void
  resetScenario: () => void
}

/** Cenário da demo (K3): fixtures [SIMULATED] validados por Zod + evento DONKI [REAL]. */
const scenario = (): ScenarioData => demoScenario()

const initialRuntime = () => ({
  ...(() => {
    const data = scenario()
    const simNowIso = missionDayToIso(DEMO_MISSION_DAY)
    return { ...data, routine: updateRoutineForClock(data.routine, simNowIso, false) }
  })(),
  missionDay: DEMO_MISSION_DAY,
  simNowIso: missionDayToIso(DEMO_MISSION_DAY),
  timeAcceleration: 1,
  alerts: [] as Alert[],
  outbox: [] as OutboundPacket[],
  consent: { shareWellbeingAlertsWithCmo: false },
  breakGlass: { active: false } as AppState['breakGlass'],
  auditLog: [] as AuditEntry[],
  shelterActive: false,
  eventReplayed: false,
})

let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      environment: DEFAULT_ENVIRONMENT,
      role: 'ASTRONAUT',
      aiMode: 'protocol',
      ...initialRuntime(),

      setEnvironment: (environment) => set({ environment }),
      setRole: (role) => set({ role }),
      setAiMode: (aiMode) => set({ aiMode }),

      setConsent: (share) =>
        set((s) => ({
          consent: { shareWellbeingAlertsWithCmo: share },
          auditLog: [
            ...s.auditLog,
            { at: s.simNowIso, actor: 'ASTRONAUT', action: 'CONSENT_CHANGED', target: 'wellbeing' },
          ],
        })),

      breakGlassAccess: (reason) => {
        const trimmed = reason.trim()
        if (!trimmed) throw new Error('Break-glass requires a reason (PRIV-03).')
        set((s) => ({
          breakGlass: { active: true, reason: trimmed, at: s.simNowIso },
          auditLog: [
            ...s.auditLog,
            { at: s.simNowIso, actor: s.role, action: 'BREAK_GLASS_VIEW', target: 'wellbeing', reason: trimmed },
          ],
        }))
      },
      endBreakGlass: () => set({ breakGlass: { active: false } }),

      setAlerts: (alerts) => set({ alerts }),
      addReading: (reading) => set((s) => ({ vitals: [...s.vitals, reading] })),
      setRoutineStatus: (id, status) =>
        set((s) => ({ routine: s.routine.map((r) => (r.id === id ? { ...r, status } : r)) })),

      enqueuePacket: (summary, priority = 'normal') => {
        const s = get()
        const packet: OutboundPacket = {
          id: nextId('pkt'),
          createdAt: s.simNowIso,
          summary,
          etaGroundReplySec: groundReplySec(s.environment),
          status: 'queued',
          environment: s.environment,
          priority,
        }
        set({ outbox: [...s.outbox, packet] })
        return packet
      },
      setPacketStatus: (id, status) =>
        set((s) => ({ outbox: s.outbox.map((p) => (p.id === id ? { ...p, status } : p)) })),

      setTimeAcceleration: (factor) => set({ timeAcceleration: Math.max(1, factor) }),
      advanceDay: (days = 1) =>
        set((s) => {
          const missionDay = s.missionDay + days
          const simNowIso = missionDayToIso(missionDay)
          return { missionDay, simNowIso, routine: updateRoutineForClock(s.routine, simNowIso, s.shelterActive) }
        }),

      advanceDemoMinutes: (minutes) =>
        set((s) => {
          const simNowIso = new Date(Date.parse(s.simNowIso) + Math.max(0, minutes) * 60_000).toISOString()
          const dayChanged = simNowIso.slice(0, 10) !== s.simNowIso.slice(0, 10)
          const routine = dayChanged ? s.routine.map((item) => ({ ...item, status: 'due' as const })) : s.routine
          const missionDay = Math.floor((Date.parse(simNowIso) - Date.parse(MISSION_START_ISO)) / DAY_MS)
          return { simNowIso, missionDay, routine: updateRoutineForClock(routine, simNowIso, s.shelterActive) }
        }),

      replaySolarEvent: () => set((s) => ({ eventReplayed: true, shelterActive: true, routine: s.routine.map((item) => item.status === 'done' ? item : { ...item, status: 'postponed' }) })),
      endShelter: () => set((s) => ({ shelterActive: false, routine: updateRoutineForClock(s.routine.map((item) => item.status === 'postponed' ? { ...item, status: 'due' } : item), s.simNowIso, false) })),

      loadScenario: (data) => set(data),
      resetScenario: () => set(initialRuntime()),
    }),
    {
      name: 'apollo62:prefs',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Só preferências persistem; o cenário da demo sempre recomeça igual.
      // aiMode não persiste: o modelo de bordo precisa ser carregado de novo a cada sessão (começa em protocolo).
      partialize: (s) => ({ environment: s.environment, role: s.role }),
    },
  ),
)

function updateRoutineForClock(routine: RoutineItem[], nowIso: string, shelterActive: boolean): RoutineItem[] {
  if (shelterActive) return routine.map((item) => item.status === 'done' ? item : { ...item, status: 'postponed' })
  const now = new Date(nowIso)
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes()
  return routine.map((item) => {
    if (item.status === 'done' || item.status === 'postponed') return item
    const [hours, minutes] = item.time.split(':').map(Number)
    return { ...item, status: minutesNow > hours * 60 + minutes ? 'overdue' : 'due' }
  })
}
