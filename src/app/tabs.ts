// Abas da Sidebar (SPEC §5.2). Cada aba aponta para a pasta da feature e para o dono/task no kanban.
import {
  Activity,
  BookOpen,
  Dumbbell,
  HeartPulse,
  Orbit,
  Radiation,
  Ruler,
  Smile,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type TabId =
  | 'overview'
  | 'vitals'
  | 'reference'
  | 'radiation'
  | 'wellbeing'
  | 'exercise'
  | 'outlook'
  | 'assistant'
  | 'sources'

export interface TabDef {
  id: TabId
  label: string // texto da UI (inglês)
  icon: LucideIcon
  owner: 'Kayque' | 'Lucas' | 'Felipe'
  task: string // id da task no kanban
}

export const TABS: readonly TabDef[] = [
  { id: 'overview', label: 'Overview', icon: Activity, owner: 'Lucas', task: 'L3 #54' },
  { id: 'vitals', label: 'Vitals', icon: HeartPulse, owner: 'Lucas', task: 'L4 #55' },
  { id: 'reference', label: 'Baseline', icon: Ruler, owner: 'Lucas', task: 'L7 · T7/T8' },
  { id: 'radiation', label: 'Radiation', icon: Radiation, owner: 'Felipe', task: 'F2 #45' },
  { id: 'exercise', label: 'Exercise', icon: Dumbbell, owner: 'Felipe', task: 'F3 #56' },
  { id: 'wellbeing', label: 'Wellbeing', icon: Smile, owner: 'Felipe', task: 'F4 #47' },
  { id: 'outlook', label: 'Crew outlook', icon: Users, owner: 'Lucas', task: 'L7 · T9' },
  // Orbit (L7) substitui o assistente antigo; o id 'assistant' fica para não quebrar links (#/assistant).
  { id: 'assistant', label: 'Orbit', icon: Orbit, owner: 'Kayque', task: 'K7 #48 · L7' },
  { id: 'sources', label: 'Data & Sources', icon: BookOpen, owner: 'Felipe', task: 'F5 #49' },
]

export const DEFAULT_TAB: TabId = 'overview'

export function isTabId(value: string): value is TabId {
  return TABS.some((t) => t.id === value)
}
