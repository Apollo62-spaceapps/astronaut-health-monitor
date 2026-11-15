// Abas da Sidebar (SPEC §5.2). Cada aba aponta para a pasta da feature e para o dono/task no kanban.
import {
  Activity,
  BookOpen,
  Bot,
  CalendarClock,
  Dumbbell,
  HeartPulse,
  Radiation,
  RadioTower,
  Smile,
  type LucideIcon,
} from 'lucide-react'

export type TabId =
  'overview' | 'vitals' | 'routine' | 'radiation' | 'wellbeing' | 'exercise' | 'comms' | 'assistant' | 'sources'

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
  { id: 'routine', label: 'Routine', icon: CalendarClock, owner: 'Felipe', task: 'F1 #59' },
  { id: 'radiation', label: 'Radiation', icon: Radiation, owner: 'Felipe', task: 'F2 #45' },
  { id: 'exercise', label: 'Exercise', icon: Dumbbell, owner: 'Felipe', task: 'F3 #56' },
  { id: 'wellbeing', label: 'Wellbeing', icon: Smile, owner: 'Felipe', task: 'F4 #47' },
  { id: 'comms', label: 'Comms', icon: RadioTower, owner: 'Kayque', task: 'K6 #46' },
  { id: 'assistant', label: 'Assistant', icon: Bot, owner: 'Kayque', task: 'K7 #48' },
  { id: 'sources', label: 'Data & Sources', icon: BookOpen, owner: 'Felipe', task: 'F5 #49' },
]

export const DEFAULT_TAB: TabId = 'overview'

export function isTabId(value: string): value is TabId {
  return TABS.some((t) => t.id === value)
}
