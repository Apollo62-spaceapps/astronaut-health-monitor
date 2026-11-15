// Estado de interface do Orbit (L7): conversa (compartilhada entre a página e a gaveta), gaveta aberta e as
// ações propostas que esperam a pessoa (medir, revisar o pacote). NÃO guarda dado de saúde e não escreve em
// alertas: quem decide é o motor de regras (AI-07). Fica fora do store principal (contrato K2).
// Leve de propósito (só tipos importados): entra no chunk inicial; o resto do Orbit é carregado sob demanda.
import { create } from 'zustand'
import type { OrbitQuestion } from '@/ai/engine'
import type { StructuredReply } from '@/ai/schema'
import type { TriageState } from '@/ai/triage'
import type { VitalKind } from '@/domain/types'

export interface OrbitMessage {
  id: string
  role: 'user' | 'orbit'
  text?: string
  reply?: StructuredReply
  /** Triagem em andamento (fluxo guiado). */
  triage?: TriageState
  at: string
}

interface OrbitUiState {
  open: boolean
  /** Alguém já usou o Orbit nesta sessão: carrega o runtime (gaveta, respostas, diálogos). */
  activated: boolean
  messages: OrbitMessage[]
  busy: boolean
  /** Pergunta esperando o host (que tem o contexto) responder. */
  pending: OrbitQuestion | null
  /** Ação "Re-measure" aberta (diálogo de medida). */
  measure: VitalKind | null
  /** Prévia do pacote aberta; `report` = relato da triagem anexado. */
  packet: { report?: string } | null
  openDrawer: () => void
  closeDrawer: () => void
  /** Pergunta ao Orbit (das telas, dos chips ou do campo). `openDrawer` abre a gaveta junto. */
  ask: (q: OrbitQuestion, opts?: { openDrawer?: boolean }) => void
  push: (m: Omit<OrbitMessage, 'id'>) => string
  update: (id: string, patch: Partial<OrbitMessage>) => void
  setBusy: (busy: boolean) => void
  takePending: () => OrbitQuestion | null
  setMeasure: (vital: VitalKind | null) => void
  setPacket: (packet: { report?: string } | null) => void
  clear: () => void
}

let seq = 0
const nextId = () => `orbit-msg-${++seq}`

export const useOrbitStore = create<OrbitUiState>()((set, get) => ({
  open: false,
  activated: false,
  messages: [],
  busy: false,
  pending: null,
  measure: null,
  packet: null,
  openDrawer: () => set({ open: true, activated: true }),
  closeDrawer: () => set({ open: false }),
  ask: (q, opts) => set({ pending: q, activated: true, ...(opts?.openDrawer ? { open: true } : {}) }),
  push: (m) => {
    const id = nextId()
    set((s) => ({ messages: [...s.messages, { ...m, id }] }))
    return id
  },
  update: (id, patch) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  setBusy: (busy) => set({ busy }),
  takePending: () => {
    const p = get().pending
    if (p) set({ pending: null })
    return p
  },
  setMeasure: (measure) => set({ measure, activated: true }),
  setPacket: (packet) => set({ packet, activated: true }),
  clear: () => set({ messages: [], pending: null }),
}))
