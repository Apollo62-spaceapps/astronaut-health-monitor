// ════════════════════════════════════════════════════════════════════════════════════════
// CONTRATO DE DADOS (K2 #42) — compartilhado por Kayque, Lucas e Felipe.
// Fonte: docs/SPEC-frontend.md §5.4 (modelo), §6.6 (assistente), adendo §17 (ambientes)
// e adendo §18 (rotina). Mudar este arquivo só por PR pequeno, combinado entre os três.
// Regras inegociáveis: a cor vem das regras (src/domain/rules), nunca da IA; todo número
// tem Provenance (REAL/SIMULATED); nunca "fit"/"healthy"/diagnóstico.
// ════════════════════════════════════════════════════════════════════════════════════════

// ───────────────────────────── Proveniência e fontes ─────────────────────────────

/** Id do catálogo de fontes (SPEC §16): S01…S19 (e S20+ se o time acrescentar fonte verificada). */
export type SourceId = `S${number}`

/** Todo número exibido carrega a proveniência (NFR-05). `basis` = fonte usada como referência. */
export type Provenance =
  { kind: 'real'; sourceId: SourceId; note?: string } | { kind: 'simulated'; basis?: SourceId; note?: string }

export interface Source {
  id: SourceId
  provider: string
  title: string
  urls: string[]
  /** Data de acesso (ISO, AAAA-MM-DD). */
  accessed: string
  /** Para que o sistema usa a fonte. */
  use: string
  /** Licença / termos (SRC-01). */
  terms: string
}

// ───────────────────────────── Sinais vitais (SPEC §5.4, §6.1) ─────────────────────────────

export type VitalKind = 'heartRate' | 'systolicBP' | 'diastolicBP' | 'glucose' | 'bodyTemp'
export type VitalUnit = 'bpm' | 'mmHg' | 'mg/dL' | '°C'

export const VITAL_KINDS: readonly VitalKind[] = ['heartRate', 'systolicBP', 'diastolicBP', 'glucose', 'bodyTemp']

export interface VitalReading {
  kind: VitalKind
  value: number
  unit: VitalUnit
  /** ISO 8601 do tempo SIMULADO da missão (use o relógio do store, não Date.now()). */
  takenAt: string
  provenance: Provenance
}

export interface Baseline {
  kind: VitalKind
  /** Baseline pré-voo. */
  preflightMean: number
  /** Média móvel em voo. */
  inflightMean: number
  /** Janela da média móvel, em dias [PENDENTE P-01]. */
  windowDays: number
}

// ───────────────────────────── Bem-estar (DADO RESTRITO, §6.3) ─────────────────────────────

export interface WellbeingEntry {
  date: string
  /** Ambiente em que o autorrelato foi registrado; registros antigos sem campo são Earth. */
  environment?: MissionMode
  /** Autorrelato simples, NÃO é instrumento validado. */
  mood: 1 | 2 | 3 | 4 | 5
  sleepHours: number
  note?: string
}

// ───────────────────────────── Exercício (§6.4) ─────────────────────────────

/** Equipamentos da ISS [FATO, S13]. */
export type ExerciseDevice = 'ARED' | 'T2' | 'CEVIS'

export interface ExerciseSession {
  date: string
  device: ExerciseDevice
  /** Plano do ASCR [SIMULATED]. */
  prescribedMin: number
  doneMin: number
  status: 'done' | 'partial' | 'skipped' | 'postponed'
  /** Protótipo: sempre autorrelato. */
  selfReported: true
  /** Motivo quando postponed (ex.: "shelter active"). */
  reason?: string
}

// ───────────────────────────── Radiação (§6.2) ─────────────────────────────

export interface RadiationState {
  /** Dose de carreira antes da missão [SIMULATED]. */
  careerPriorMSv: number
  /** Taxa diária da missão. Vem do ambiente (§17); null = sem fonte para este ambiente (P-16). */
  missionDayRateMSv: number | null
  /** Limite de carreira [FATO, S03]. */
  careerLimitMSv: 600
}

/** Espelha os campos do DONKI [REAL, S07]. */
export interface SpaceWeatherEvent {
  sepID: string
  eventTime: string
  instrument: string
  link: string
  linkedEvents: string[]
  provenance: Provenance
}

// ───────────────────────────── Ambientes (adendo §17) ─────────────────────────────

/**
 * Modo da plataforma, trocado pelo botão de modo de ambiente (K5). NÃO é tema escuro.
 * Spacecraft = nave menor em trânsito (cenário a caminho de Marte).
 * Space Station (ISS) = estação maior onde a nave atraca e recebe manutenção.
 */
export type MissionMode = 'EARTH' | 'ISS' | 'LUNAR' | 'SPACECRAFT'

export const MISSION_MODES: readonly MissionMode[] = ['EARTH', 'ISS', 'LUNAR', 'SPACECRAFT']

export type Hazard = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'hostileEnvironment'

export interface MissionProfile {
  mode: MissionMode
  /** Texto da UI: "Earth" | "Space Station" | "Moon" | "Spacecraft". */
  label: string
  oneWayDelaySec: number
  /** De onde vem o número do atraso (com fonte ou "cálculo"/"decisão"). */
  delayNote: string
  gravity: 'earth' | 'micro' | 'partial'
  /** null = sem fonte para este ambiente → não mostrar número (ENV-04, P-16). */
  doseRateMSvPerDay: number | null
  doseRateProvenance?: Provenance
  /** null = "simulated habitat equipment" (P-18). */
  exerciseDevices: ExerciseDevice[] | null
  emphasizedHazards: Hazard[]
  /** Valor de data-environment no <html>; muda só a cor da faixa da missão (DESIGN-SYSTEM §7). */
  themeToken: 'earth' | 'station' | 'moon' | 'spacecraft'
  /** Ícone (lucide-react) do botão de modo. */
  icon: 'Globe' | 'Satellite' | 'Moon' | 'Rocket'
}

// ───────────────────────────── Perfis, status, corpo (§3, §6.1.1, §6.7) ─────────────────────────────

export type Role = 'ASTRONAUT' | 'CMO' | 'FLIGHT_SURGEON'
export type AlertLevel = 'normal' | 'attention' | 'urgent'
/** Status de zona do mapa do corpo. Rótulos da UI: Normal / Attention / Urgent / Adapting / Restricted. */
export type ZoneStatus = AlertLevel | 'adapting' | 'restricted'

/** Radiação é overlay do corpo inteiro, não zona. */
/** Arms entrou em 15/11 (decisão do time): musculoesquelético, mesmo indicador de Legs. */
export type BodyZoneId = 'head' | 'heart' | 'torso' | 'skin' | 'arms' | 'legs'
export type BodyIndicator = VitalKind | 'mood' | 'sleep' | 'exerciseAdherence'

export interface BodyZone {
  id: BodyZoneId
  /** Texto da UI (inglês). */
  label: string
  /** "Function" do card da zona (BODY-03). */
  functionText: string
  indicators: BodyIndicator[]
  /** null = a confirmar (P-13). */
  hazard: Hazard | null
  /** Exibido no card: fato com fonte, inferência do time ou pendente. */
  hazardBasis: 'fact' | 'inference' | 'pending'
  sourceIds: SourceId[]
  /** Prioridade da zona (Legs é P1). */
  priority: 'P0' | 'P1'
}

export type MissionPhase = 'EARTH' | 'TRANSIT' | 'SURFACE'

// ───────────────────────────── Alertas, auditoria, fila (§6.5, §6.7, §7) ─────────────────────────────

export interface Alert {
  id: string
  /** Rastreabilidade: id da regra que gerou (ex.: "R-VIT-02"). */
  ruleId: string
  level: AlertLevel
  title: string
  message: string
  /** Só ações não clínicas (CORE-09) ou com fonte (ex.: abrigo Orion, RAD-04). */
  safeActions: string[]
  escalateTo: Role[]
  createdAt: string
}

export interface AuditEntry {
  at: string
  actor: Role
  action: 'BREAK_GLASS_VIEW' | 'CONSENT_CHANGED'
  target: 'wellbeing'
  reason?: string
}

/** Pacote store-and-forward ao solo. */
export interface OutboundPacket {
  id: string
  createdAt: string
  summary: string
  /** 2 × oneWayDelaySec do ambiente. */
  etaGroundReplySec: number
  status: 'queued' | 'sent' | 'reply-received'
  /** Ambiente em que o pacote foi criado (ENV-05). */
  environment: MissionMode
  priority: 'normal' | 'priority'
}

// ───────────────────────────── Rotina da missão (adendo §18) ─────────────────────────────

export type RoutineKind = 'measure' | 'checkin' | 'exercise' | 'maintenance'
/** Estados da rotina: estilo NEUTRO na UI, nunca as cores de saúde (ROUT-02). */
export type RoutineStatus = 'due' | 'overdue' | 'done' | 'postponed'

export interface RoutineItem {
  id: string
  /** Texto da UI (inglês), ex.: "Measure resting heart rate". */
  title: string
  kind: RoutineKind
  /** Medição pedida, quando kind = 'measure'. */
  vital?: VitalKind
  /** Horário do dia simulado, "HH:MM". */
  time: string
  /** Em quais ambientes o item aparece (ex.: manutenção da Spacecraft só na ISS). */
  environments: MissionMode[]
  status: RoutineStatus
  provenance: Provenance
}

// ───────────────────────────── Assistente (§6.6) ─────────────────────────────

/** Montado pelo motor de regras, nunca pela LLM. */
export interface AssistantContext {
  missionMode: MissionMode
  activeAlerts: Alert[]
  vitalsSummary: { kind: VitalKind; deviationPct: number; status: AlertLevel }[]
  activeEvent?: SpaceWeatherEvent
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  /** Qual motor gerou (para o rótulo). */
  engine?: 'onboard-model' | 'protocol'
  at: string
}

export type AiMode = 'onboard-model' | 'protocol'

export interface AssistantEngine {
  readonly mode: AiMode
  init(onProgress?: (p: number, text: string) => void): Promise<void>
  reply(ctx: AssistantContext, history: ChatMessage[], userText: string): Promise<string>
}
