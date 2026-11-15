# O que já está pronto e como usar (atualizado em 14/11, ~23h)

As tasks **K1 a K5** estão na `main`. Rode:

```bash
git pull && npm install && npm run dev
```

O app abre com a casca completa, a faixa da missão, o botão de modo de ambiente e os dados da demo carregados. Cada aba mostra uma página "Coming soon" com o dono e a task.

## 1. Onde colocar o seu código

| Você faz | Arquivo da sua tela (já existe, substitua o conteúdo) |
|---|---|
| Lucas · L3 | `src/features/overview/OverviewPage.tsx` |
| Lucas · L4 | `src/features/vitals/VitalsPage.tsx` |
| Lucas · L1, L2 | `src/domain/rules/*.ts` (crie: `vitals.ts`, `body.ts`, `privacy.ts`, `radiation.ts`, `exercise.ts`, `escalation.ts`, `engine.ts` + `*.test.ts`) |
| Felipe · F1 | `src/features/routine/RoutinePage.tsx` |
| Felipe · F2 | `src/features/radiation/RadiationPage.tsx` |
| Felipe · F3 | `src/features/exercise/ExercisePage.tsx` |
| Felipe · F4 | `src/features/wellbeing/WellbeingPage.tsx` |
| Felipe · F5 | `src/features/sources/SourcesPage.tsx` + `src/features/demo/` (painel Demo controls) |

As abas ficam em `src/app/tabs.ts` e não precisam ser mexidas.

## 2. Estado global (`src/state/store.ts`)

```tsx
import { useAppStore } from '@/state/store'

const environment = useAppStore((s) => s.environment) // 'EARTH' | 'ISS' | 'LUNAR' | 'SPACECRAFT'
const role = useAppStore((s) => s.role)               // 'ASTRONAUT' | 'CMO' | 'FLIGHT_SURGEON'
const vitals = useAppStore((s) => s.vitals)           // VitalReading[] — 120 dias em voo
const preflight = useAppStore((s) => s.preflight)     // VitalReading[] — 14 dias de pré-voo
const addReading = useAppStore((s) => s.addReading)   // Log measurement (F1)
```

**Dados disponíveis no store:**

| Campo | O que é |
|---|---|
| `vitals`, `preflight` | Leituras dos vitais (em voo e pré-voo) |
| `wellbeing` | Bem-estar (dado **restrito**) |
| `exercise` | Sessões de exercício |
| `routine` | Itens da rotina |
| `radiation` | Estado de radiação |
| `spaceWeatherEvent` | O evento real do DONKI |
| `missionDay`, `simNowIso` | Relógio **simulado**. Use esses, nunca `Date.now()` |
| `alerts` | Escritos **só** pelas regras, via `setAlerts` |
| `outbox` | Fila ao solo |
| `consent`, `breakGlass`, `auditLog` | Privacidade |
| `shelterActive`, `eventReplayed` | Estado da demo |

**Ações:**
- Missão: `setEnvironment`, `setRole`, `setAiMode`.
- Privacidade: `setConsent(share)`, `breakGlassAccess(reason)` (o motivo é obrigatório e gera auditoria), `endBreakGlass`.
- Dados: `setAlerts`, `addReading`, `setRoutineStatus(id, status)`.
- Fila: `enqueuePacket(summary, priority)`, `setPacketStatus`.
- Demo: `setTimeAcceleration`, `advanceDay`, `replaySolarEvent`, `endShelter`, `resetScenario`.

## 3. Configurações (`src/domain/config/`)

- `environments.ts` → `ENVIRONMENTS[environment]`, com:
  - `label`;
  - `oneWayDelaySec` e `groundReplySec(mode)` (2 × o atraso);
  - `doseRateMSvPerDay` (**null = não mostrar número**);
  - `exerciseDevices` (null = "simulated habitat equipment");
  - `emphasizedHazards` e `gravity`.
- `thresholds.ts` → limiares **placeholder P-01** (o Lucas decide os valores) e `INPUT_PLAUSIBILITY` (validação do Log measurement).
- `bodyZones.ts` → `BODY_ZONES` (Head, Heart, Torso, Skin, Legs), `RADIATION_OVERLAY` e `HAZARD_LABEL`.

## 4. Tipos (`src/domain/types.ts`)

Use sempre os tipos daqui; não crie tipos paralelos:
- `VitalReading`, `Baseline`, `WellbeingEntry`, `ExerciseSession`, `RadiationState`, `SpaceWeatherEvent`;
- `MissionMode`, `MissionProfile`, `Role`;
- `AlertLevel`, `ZoneStatus`, `BodyZone`, `Alert`, `AuditEntry`, `OutboundPacket`;
- `RoutineItem`, `RoutineStatus`;
- `AssistantContext`, `ChatMessage`, `Provenance`, `Source`.

## 5. Componentes prontos (`src/components/`), conforme o `docs/DESIGN-SYSTEM.md`

```tsx
import { StatusBadge } from '@/components/StatusBadge'           // ✓ Normal ▲ Attention ● Urgent ◼ Restricted ↻ Adapting
import { ProvenanceBadge } from '@/components/ProvenanceBadge'   // REAL · DONKI / SIMULATED
import { IllustrativeThresholds } from '@/components/IllustrativeThresholds'
import { MetricCard } from '@/components/MetricCard'

<MetricCard label="Heart rate · rest" value="84" unit="bpm" status="attention" statusDetail="+18%"
            provenance={{ kind: 'simulated' }} />
```

- **shadcn/ui** em `src/components/ui/`: `button`, `card`, `badge`, `dialog` (break-glass), `tooltip`, `tabs`, `toggle-group`, `switch` (consentimento), `input`, `label`, `select`, `progress` (barra de dose), `separator`, `textarea`.
- **Botão primário vermelho:** `<Button>` (variante padrão). Use **só um** por tela.
- **Classes do design system:**
  - cores: `bg-surface`, `bg-banner`, `text-normal`, `text-attention`, `text-urgent`, `text-muted`, `text-link`;
  - `num`: números em mono tabular;
  - `hatch`: hachura.

## 6. Dados (`src/data/`)

- `scenario.ts`: `demoScenario()`, `ASTRONAUT` e `DEMO_SPACE_WEATHER_EVENT` (o evento real `2024-05-11T02:10:00-SEP-001`, GOES-P SEISS >100 MeV).
- `sources.ts`: `SOURCES` (S01–S19), `sourceById(id)` e `DONKI_ACKNOWLEDGEMENT` (para a F5).
- **Fixtures:**
  - estão em `src/data/fixtures/`;
  - são gerados por `npm run fixtures` (semente fixa) e conferidos com `npm run fixtures:check`;
  - **não edite os JSON à mão**: mude o `scripts/generate-fixtures.mjs` e rode de novo.
- **Números do dia 120** (iguais aos da tela de referência):

  | Medida | Valor |
  |---|---|
  | FC | 84 bpm (+18% sobre o pré-voo de 71,2) |
  | PA | 121/79 |
  | Dose | 216 mSv = 36% de 600 |
  | Adesão ao exercício | 86% |
  | Sequência | 6 dias |

## 7. Enquanto as regras do Lucas não chegam (Felipe e Kayque)

Crie uma função temporária **com a assinatura que o Lucas vai usar** e marque com:

```ts
// TODO(Lucas): trocar pela regra real
```

Quando a regra entrar, troque só o import.
