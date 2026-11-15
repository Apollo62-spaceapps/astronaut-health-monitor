# SPEC — Frontend do protótipo <SYSTEM_NAME>

Time: Apollo 62 · NASA Space Apps Challenge 2026 (Goiânia)
Desafio: Create Health Monitoring Software for Astronauts on Space Missions
Versão: v0.2 (rascunho) · 14/11/2026. A v0.2 incorpora o mapa do corpo (§6.1.1) e resolve P-02 e P-10. Entrega: domingo, por volta das 15h.
Status: rascunho redigido com apoio de IA. O time deve revisar, decidir os itens marcados e assumir a autoria, sobretudo as regras do motor de alertas e o roteiro da demo.

## 0. Como ler este documento

Marcadores:

| Marcador | Significado |
| --- | --- |
| [FATO] | Afirmação com fonte verificada (ver §16) |
| [DECISÃO] | Escolha do time ou de design, não é fato científico |
| [PENDENTE P-xx] | Ainda não decidido (ver §13) |
| [SIMULATED] | Dado fictício gerado para a demo (mesmo rótulo usado na interface) |
| [REAL] | Dado real de fonte oficial |

Prioridades:

- P0: obrigatório para a demo do pitch.
- P1: entra se sobrar tempo.
- P2: só no roadmap do pitch, não será implementado.

Idiomas: a interface e todos os textos da tela são em inglês. Este documento está em português.

## 1. Contexto e objetivo

O briefing pede uma ferramenta visual que ajude astronautas a avaliar a própria saúde durante missões e que dê orientação sobre tratamentos e melhorias de saúde [FATO, S01]. Ele cita os cinco riscos do voo espacial mapeados pelo Human Research Program da NASA: radiação, isolamento e confinamento, distância da Terra, campos gravitacionais e ambientes fechados hostis. Também cita indicadores úteis: pressão arterial, frequência cardíaca, glicemia, temperatura corporal, horas de sono e humor [FATO, S01].

Proposta em uma frase:

> Um sistema em que o astronauta se autoavalia, organizado em um núcleo de sinais vitais com baseline individual e três módulos que conversam entre si (radiação, bem-estar mental e adesão ao exercício). O sistema continua funcionando longe da Terra e escalona para o CMO ou para o solo respeitando quem pode ver cada dado.

Natureza da entrega: protótipo navegável apresentado em pitch. Não é um MVP de produção nem um dispositivo médico.

## 2. Escopo

### Dentro (protótipo)

- Painel do astronauta com sinais vitais, baseline, mapa do corpo clicável e gráficos.
- Módulo de radiação com evento solar real (NASA DONKI) reproduzido no cenário e dose simulada.
- Bem-estar: registro diário de humor e sono, com acesso restrito.
- Exercício: adesão ao plano prescrito, com gamificação.
- Seletor de missão (ISS / Lua / Marte) que muda o atraso de comunicação e o escalonamento.
- Seletor de perfil (Astronauta / CMO / Flight Surgeon) com visões diferentes e acesso de emergência auditado.
- Assistente conversacional: LLM no navegador com fallback roteirizado.
- Painel “Data & Sources” com todas as fontes citadas.

### Fora (roadmap do pitch, P2)

- Autenticação real e backend.
- Integração com sensores e equipamentos reais (dosímetros, ARED, T2, CEVIS).
- Verificação automática da execução do exercício.
- Faixas clínicas validadas para os alertas.
- Instrumento validado de saúde mental.
- Dados ao vivo da NOAA e do DONKI (no protótipo, os dados são estáticos).
- PWA e service worker.

## 3. Usuários e perfis

| Perfil | Papel real [FATO] | Papel no sistema |
| --- | --- | --- |
| Astronauta (usuário principal) | Em missões longas, precisa avaliar a própria saúde (S01) | Registra medições, vê o próprio estado, recebe orientações e controla o que compartilha |
| CMO (Crew Medical Officer) | Tripulante designado como responsável médico. Muitas vezes é médico, mas não é obrigatório. No mínimo dois por veículo (S02) | Vê vitais, dose e adesão ao exercício da tripulação. Só vê dados de bem-estar por consentimento ou por acesso de emergência |
| Flight Surgeon / Crew Surgeon (solo) | Médico em solo. A autoridade médica é do Crew Surgeon (S04) | Vê tudo, incluindo bem-estar e auditoria. Recebe os pacotes com o atraso da missão |

No protótipo, a troca de perfil é feita por um seletor na barra superior. Não há login [DECISÃO].

## 4. Princípios do produto

- Astronaut-first: a tela padrão é a do astronauta (aderência ao S01).
- As regras decidem, a IA auxilia: cores, alertas e escalonamento vêm do motor de regras determinístico. A LLM só conversa e resume, e nunca muda um alerta.
- Funciona sem a Terra (pronto para EIMO): tudo roda localmente, e o atraso de comunicação faz parte da interface. Linha de pesquisa da NASA: Earth-Independent Medical Operations (S12).
- Proveniência visível: todo número na tela mostra se é REAL ou SIMULATED e de qual fonte vem.
- Privacidade por perfil: bem-estar é privado por padrão, em linha com a prática da NASA de comunicações médicas privadas (S02, S04).
- Não é diagnóstico: aviso fixo “Decision-support prototype — not a medical device, not for diagnosis.”

## 5. Arquitetura

### 5.1 Stack [DECISÃO]

> Pré-requisito confirmado: o time domina React + TypeScript (P-02 resolvida em 14/11).

> Versões: use a versão estável de cada pacote no momento do scaffold e registre-as no package.json. React 19 é a linha estável atual (confirmar o patch em react.dev/versions).

| Camada | Tecnologia | Motivo | Observação |
| --- | --- | --- | --- |
| Build | Vite (npm create vite@latest, template react-ts) | Padrão atual, sem configuração pesada | Usar a versão estável do momento |
| UI | React 19 + TypeScript strict | Versão estável atual. A tipagem evita erros com unidades e campos de saúde | — |
| Estilo | Tailwind CSS v4 | Velocidade e consistência visual | — |
| Componentes | shadcn/ui (sobre Radix) | Acessíveis (teclado e ARIA), bonitos, código copiado para o projeto | Suporte oficial a Tailwind v4 e React 19 (S18) |
| Gráficos | Apache ECharts com wrapper próprio (useECharts) | Séries temporais e linhas de referência. Descrições e padrões acessíveis. Apache-2.0 | Wrapper próprio de ~30 linhas, para evitar dependência de compatibilidade de terceiros |
| Estado | Zustand (store único) | Simples para seis pessoas mexerem em paralelo | Alternativa: Context + useReducer |
| Validação | Zod | Valida fixtures e entradas do usuário | — |
| Testes | Vitest | Testes unitários do motor de regras | P0 só para as regras |
| LLM | WebLLM (@mlc-ai/web-llm) num Web Worker + fallback roteirizado | Roda no navegador, offline após o cache, sem chave de API | Ver §6.6. Confirmar a API de Web Worker na documentação (P-03) |
| Fontes tipográficas | @fontsource (ex.: Inter e uma mono com algarismos tabulares) | Nada via CDN | — |
| Qualidade | ESLint (do template) + Prettier | Padronização | — |

Regras de engenharia:

- Nada via CDN. Tudo empacotado no build. Exceção documentada: os pesos e a biblioteca do modelo da LLM, baixados uma vez e guardados em cache (ver NFR-02 e R-06).
- Nenhum segredo no código. Não há chave de API. Mesmo assim, .env vai para o .gitignore.
- O motor de regras é composto de funções puras, sem React, testáveis isoladamente.

### 5.2 Camadas

```
┌──────────────────────────── UI (React + shadcn + ECharts) ────────────────────────────┐
│ TopBar: Mission mode · Role · Comm status · AI mode · Mission Day                     │
│ Overview │ Vitals │ Radiation │ Wellbeing │ Exercise │ Assistant │ Data & Sources     │
└───────────────▲──────────────────────────────────────────────▲────────────────────────┘
                │ lê estado / dispara ações                      │ texto
┌───────────────┴──────────────┐      ┌──────────────────────────┴──────────────────────┐
│ Store (Zustand)              │      │ Assistant (Strategy)                            │
│ role, missionMode, dados,    │      │  ├─ OnboardModelEngine (WebLLM, Web Worker)     │
│ alerts, auditLog             │      │  └─ ProtocolEngine (roteirizado, determinístico)│
└───────────────▲──────────────┘      └──────────────────────────▲──────────────────────┘
                │                                                │ contexto estruturado
┌───────────────┴────────────────────────────────────────────────┴──────────────────────┐
│ Domain: tipos · motor de regras (funções puras) · config (thresholds, missões)        │
└───────────────▲────────────────────────────────────────────────────────────────────────┘
                │
┌───────────────┴────────────────────────────────────────────────────────────────────────┐
│ Data: fixtures JSON [SIMULATED] · donki-sep-2024-05.json [REAL] · catálogo de fontes   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Estrutura de pastas

```text
src/
  app/              App.tsx, AppShell (Sidebar, TopBar), providers
  features/
    overview/       mapa do corpo, cards de status, alertas ativos, medições do dia
    vitals/         gráficos por indicador, formulário de nova medição
    radiation/      barra de dose, evento ativo, fluxo de abrigo
    wellbeing/      registro de humor/sono, bloqueio por perfil, break-glass
    exercise/       plano do dia, check-in, sequência, progresso semanal
    assistant/      chat, seletor/selo de modo de IA
    escalation/     painel de comunicação, fila store-and-forward
    sources/        painel Data & Sources
    demo/           painel Demo controls (§6.9)
  domain/
    types.ts
    rules/          engine.ts, radiation.ts, vitals.ts, wellbeing.ts, exercise.ts, escalation.ts
                    *.test.ts (Vitest)
    config/         thresholds.ts  (PENDENTE P-01), missions.ts
  ai/
    engine.ts       interface AssistantEngine + seleção do motor
    onboard.ts      WebLLM (cliente)
    onboard.worker.ts
    protocol.ts     árvore de perguntas e templates
    prompts.ts      system prompt e montagem do contexto
  data/
    fixtures/       astronaut.json, vitals.json, wellbeing.json, exercise.json
    nasa/           donki-sep-2024-05.json   (cópia fiel da resposta da API)
    sources.ts      catálogo de fontes (§16)
  state/store.ts
  components/ui/    (gerado pelo shadcn)
  lib/              useECharts.ts, format.ts (unidades, datas)
scripts/
  generate-fixtures.mjs   gera dados sintéticos com semente fixa (determinístico)
```

### 5.4 Modelo de dados (TypeScript)

```ts
type SourceId = `S${number}`;

type Provenance =
  | { kind: 'real'; sourceId: SourceId; note?: string }
  | { kind: 'simulated'; basis?: SourceId; note?: string }; // basis = fonte usada como referência

type VitalKind = 'heartRate' | 'systolicBP' | 'diastolicBP' | 'glucose' | 'bodyTemp';
type VitalUnit = 'bpm' | 'mmHg' | 'mg/dL' | '°C';

interface VitalReading {
  kind: VitalKind;
  value: number;
  unit: VitalUnit;
  takenAt: string;            // ISO 8601
  provenance: Provenance;
}

interface Baseline {
  kind: VitalKind;
  preflightMean: number;      // baseline pré-voo
  inflightMean: number;       // média móvel em voo
  windowDays: number;         // janela da média móvel [PENDENTE P-01]
}

interface WellbeingEntry {      // DADO RESTRITO
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;     // autorrelato simples, NÃO é instrumento validado
  sleepHours: number;
  note?: string;
}

type ExerciseDevice = 'ARED' | 'T2' | 'CEVIS';   // [FATO, S13]

interface ExerciseSession {
  date: string;
  device: ExerciseDevice;
  prescribedMin: number;      // plano do ASCR [SIMULATED]
  doneMin: number;
  status: 'done' | 'partial' | 'skipped' | 'postponed';
  selfReported: true;         // protótipo: sempre autorrelato
}

interface RadiationState {
  careerPriorMSv: number;     // dose de carreira antes da missão [SIMULATED]
  missionDayRateMSv: number;  // 1.8 mSv/dia, base MSL/RAD [S08, S09]
  careerLimitMSv: 600;        // [FATO, S03]
}

interface SpaceWeatherEvent {   // espelha campos do DONKI [REAL, S07]
  sepID: string;
  eventTime: string;
  instrument: string;
  link: string;
  linkedEvents: string[];
  provenance: Provenance;
}

type MissionMode = 'ISS' | 'LUNAR' | 'MARS_TRANSIT';

interface MissionProfile {
  mode: MissionMode;
  label: string;
  oneWayDelaySec: number;
  delayNote: string;          // texto de origem do número (ver §6.5)
}

type Role = 'ASTRONAUT' | 'CMO' | 'FLIGHT_SURGEON';
type AlertLevel = 'normal' | 'attention' | 'urgent';

// Mapa do corpo (§6.1.1)
type ZoneStatus = AlertLevel | 'adapting' | 'restricted';
type Hazard = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'hostileEnvironment';
type BodyZoneId = 'head' | 'heart' | 'torso' | 'skin' | 'legs';   // radiação = overlay, não zona

interface BodyZone {
  id: BodyZoneId;
  label: string;                                   // texto em inglês na UI
  indicators: (VitalKind | 'mood' | 'sleep' | 'exerciseAdherence')[];
  hazard: Hazard | null;                           // null = a confirmar (P-13)
  hazardBasis: 'fact' | 'inference' | 'pending';   // exibido no card
  sourceIds: SourceId[];
}

type MissionPhase = 'EARTH' | 'TRANSIT' | 'SURFACE';

interface Alert {
  id: string;
  ruleId: string;             // rastreabilidade (§15)
  level: AlertLevel;
  title: string;
  message: string;
  safeActions: string[];
  escalateTo: Role[];
  createdAt: string;
}

interface AuditEntry {
  at: string;
  actor: Role;
  action: 'BREAK_GLASS_VIEW' | 'CONSENT_CHANGED';
  target: 'wellbeing';
  reason?: string;
}

interface OutboundPacket {      // store-and-forward
  id: string;
  createdAt: string;
  summary: string;
  etaGroundReplySec: number;  // 2 × oneWayDelaySec
  status: 'queued' | 'sent' | 'reply-received';
}
```

## 6. Requisitos funcionais

### 6.1 Núcleo: vitais, baseline e visão geral

| ID | Requisito | Prioridade |
| --- | --- | --- |
| CORE-01 | A tela Overview mostra o mapa do corpo (Body Status Map), especificado em §6.1.1. | P0 |
| CORE-02 | Cada indicador tem um card com o valor atual, a unidade, o desvio % em relação ao baseline, a tendência, o selo de proveniência e o status. | P0 |
| CORE-03 | O status usa cor + ícone + texto (“Normal”, “Attention”, “Urgent”). A cor nunca é o único sinal (acessibilidade). | P0 |
| CORE-04 | O status é calculado pelo motor de regras com limiares de config/thresholds.ts. Enquanto P-01 não for decidido, os limiares ficam como placeholders marcados e a interface exibe o selo “Illustrative thresholds”. | P0 |
| CORE-05 | Gráfico por indicador com série temporal (média móvel de 7 dias), **uma** faixa de referência (baseline pré-voo ± limiar de atenção, ilustrativo até P-01) e o valor de hoje destacado com a cor do status. A média em voo aparece como texto no card, não como segunda linha. Ver `docs/DESIGN-SYSTEM.md` v2 §6. *(Alterado em 15/11/2026: dois baselines sobrepostos dificultavam a leitura; a pesquisa sobre exibição de resultados ao paciente indica uma referência única.)* | P0 |
| CORE-06 | Formulário “Log measurement” com validação Zod. Os limites são de plausibilidade de entrada (bloquear erro de digitação), não critério clínico [DECISÃO]. | P1 |
| CORE-07 | Lista “Today’s measurements” com as medições previstas para o dia e o status de cada uma (o briefing sugere lembretes de medição, S01). | P1 |
| CORE-08 | Ícone ⓘ “Why this matters” em cada indicador, com uma explicação curta e um link para a fonte (o briefing pede instruções simples, S01). | P0 (texto curto) |
| CORE-09 | Orientação em alertas de vitais (o briefing pede orientação, S01). Usar apenas ações não clínicas: “Re-measure”, “Notify CMO” e “Follow the onboard medical checklist”. O checklist médico de bordo é prática real (S04). Orientação de tratamento específica exige fonte médica [PENDENTE P-12]. | P0 |

### 6.1.1 Mapa do corpo (Body Status Map)

Ideia do time: uma silhueta humana em que cada zona tem um status, como o painel de danos de um carro de F1. O astronauta bate o olho, vê onde está o problema e clica para entender. Isso atende diretamente à sugestão do briefing (S01). Sozinho não é diferencial, porque outros times terão algo parecido. O diferencial está no que o card mostra (baseline pessoal, hazard e fonte) e na integração com a privacidade e com as fases da missão.

Zonas [DECISÃO]: o mapeamento é proposta do time, e a ligação de cada zona com um hazard segue a base indicada.

| Zona | Indicadores | Hazard relacionado | Base da ligação | Prioridade |
| --- | --- | --- | --- | --- |
| Head / brain | sono, humor (restrito) | Isolation & confinement | [FATO, S19]: a NASA associa sono, ritmo circadiano e saúde comportamental ao isolamento e ao confinamento | P0 |
| Heart | FC de repouso, pressão arterial | Gravity fields | [FATO, S19]: declínio da função cardíaca em voo e intolerância ortostática (dificuldade de manter a pressão ao ficar de pé) na troca de gravidade | P0 |
| Torso / metabolic | glicemia | a confirmar | [PENDENTE P-13]: o briefing cita nutrição inadequada como problema, mas nenhuma fonte lida liga glicemia a um hazard específico | P0 |
| Skin / body | temperatura | Hostile/closed environments | [INFERÊNCIA do time]: a NASA relata sistema imune alterado e microrganismos que passam mais facilmente de pessoa para pessoa em habitat fechado (S19). Usar a temperatura como sinal de possível infecção é inferência nossa e deve ser apresentado assim | P0 |
| Whole-body overlay | dose de radiação | Space radiation | [FATO, S19, S03] | P0 |
| Legs / musculoskeletal | adesão ao exercício | Gravity fields | [FATO, S19]: perda de massa óssea e muscular em microgravidade | P1 |
| (não é zona) | atraso de comunicação | Distance from Earth | Representado pelo painel de comunicação (§6.5), não pelo corpo | — |
| Dados de cabine (CO₂ etc.) | — | Hostile/closed environments | Falta fonte de dados [PENDENTE P-15] | P2 |

Com isso, os cinco hazards do briefing aparecem na interface: quatro no corpo e um (distância da Terra) no painel de comunicação. Os quatro sistemas propostos pelo Luiz (cardiovascular, neurológico, musculoesquelético e metabólico) correspondem às zonas Heart, Head, Legs e Torso.

| ID | Requisito | Prioridade |
| --- | --- | --- |
| BODY-01 | Componente BodyMap: SVG com um <g data-zone> por zona. O status vem do store e só troca o atributo data-status. A configuração das zonas fica em domain/config/bodyZones.ts. | P0 |
| BODY-02 | O status da zona é o pior status entre os indicadores dela (R-BODY-01). | P0 |
| BODY-03 | Clique (ou Enter/Espaço) abre o card da zona com, nesta ordem: (1) Function: o que a parte do corpo faz; (2) Indicator: valor de hoje contra o baseline pessoal (desvio %); (3) Related hazard; (4) How to measure · Why it matters · What to do, com ações limitadas às de CORE-09; (5) Source: a fonte citada. Quando não houver protocolo com fonte, mostrar “Consult your flight surgeon.” | P0 |
| BODY-04 | Acessibilidade: cada zona tem cor, ícone e um rótulo de texto ao lado, além de hachura nos status que não forem normais (para daltonismo). As zonas são focáveis por teclado e têm aria-label (ex.: “Heart — Attention — heart rate +18% vs baseline”). | P0 |
| BODY-05 | Animação: vermelho com pulso de no máximo ~1,5 Hz, bem abaixo do limite de 3 piscadas por segundo da WCAG 2.3.1. Amarelo com pulso suave ou estático [DECISÃO]. Sem animação quando prefers-reduced-motion estiver ativo. | P1 |
| BODY-06 | Privacidade: na visão do CMO, a zona Head fica cinza, com cadeado (“Restricted”) e sem cor, porque a cor sozinha já revelaria o estado de saúde mental. Ela só ganha cor com consentimento (e então mostra apenas o nível do alerta, MH-04) ou depois de um break-glass (PRIV-03). | P0 |
| BODY-07 | Nunca usar “fit”, “apto” ou “healthy” nem dar diagnóstico. Os rótulos são Normal / Attention / Urgent / Adapting / Restricted. Zonas com dado simulado mostram o selo SIMULATED. | P0 |
| BODY-08 | Advance day (Demo controls): avança o dia da missão sobre os fixtures, e as zonas e os gráficos se atualizam. | P1 |
| BODY-09 | Fases da missão (Earth → Transit → Surface): depois de uma troca de campo gravitacional, as zonas afetadas mostram “Adapting” (cor neutra, sem alarme) durante uma janela de adaptação. Base: a troca de gravidade afeta orientação, equilíbrio e coordenação e pode causar enjoo de movimento (S19). O enjoo associado à adaptação dura, em média, 3 dias (S04). As janelas dos outros indicadores estão em [PENDENTE P-14]. Regra de segurança: “Adapting” só substitui attention, e urgent nunca é mascarado (R-PHASE-01). Ligação com drift: a mudança de fase muda a distribuição esperada dos dados, então o baseline em voo passa a usar uma janela que começa na transição (P-01, P-14). | P1 |
| BODY-10 | Fluxo guiado de emergência por zona (ex.: dor no peito) só com protocolo médico citado [PENDENTE P-12]. Até lá, a emergência da demo é o abrigo de radiação (RAD-04), que tem fonte. | P2 |

### 6.2 Radiação

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RAD-01 | Barra “Career dose” = (dose prévia + dose da missão) ÷ 600 mSv, em %. O limite é [FATO, S03]. As doses são [SIMULATED]. | P0 |
| RAD-02 | A dose da missão é calculada como dias × 1,8 mSv/dia, a taxa média de dose equivalente de raios cósmicos galácticos medida pelo MSL/RAD no trajeto até Marte [FATO, S09; artigo original S08]. Tooltip: “Simulated using MSL/RAD cruise average (galactic cosmic rays).” Simplificação declarada em R-08. | P0 |
| RAD-03 | Card “Space weather event” com o evento real 2024-05-11T02:10:00-SEP-001 (GOES-P SEISS >100 MeV, ligado a uma erupção às 01:10 UTC e a uma CME às 01:36 UTC), com link para o DONKI. Rótulo: “Real event observed near Earth (NASA DONKI), replayed in this scenario.” [REAL, S07] | P0 |
| RAD-04 | Ao disparar o evento (botão “Replay event” no modo demo), gera um alerta urgent com o fluxo de abrigo baseado no procedimento da Orion [FATO, S05]: (1) abrir os compartimentos de abrigo designados e retirar as bolsas de carga; (2) posicionar as bolsas para cobrir as áreas menos protegidas (há até 1 hora para preparar); (3) abrigar-se até a liberação, o que pode chegar a 24 h. Rótulo: “Adapted from NASA Orion radiation shelter procedure.” A nave do cenário é fictícia, por isso “adaptado”. | P0 |
| RAD-05 | Durante o abrigo, o exercício do dia muda para postponed, com o motivo “shelter active”. É uma consequência lógica, não uma recomendação médica. | P0 |
| RAD-06 | O incremento de dose durante o evento usa valor ilustrativo [SIMULATED] até existir fonte [PENDENTE P-04]. | P1 |
| RAD-07 | Não exibir nível S (S1–S5) como dado real. O DONKI não informa o fluxo. A escala S da NOAA pode aparecer apenas como referência explicativa no ⓘ [FATO, S14]. | P0 (restrição) |

### 6.3 Bem-estar (humor e sono): DADO RESTRITO

| ID | Requisito | Prioridade |
| --- | --- | --- |
| MH-01 | Check-in diário: humor de 1 a 5 (com emojis e rótulos) e horas de sono. Texto na interface: “Self-report, not a clinical assessment.” | P0 |
| MH-02 | Gráfico de 14 dias de humor e sono, visível para o Astronauta e o Flight Surgeon. O CMO só vê via break-glass (PRIV-03). | P0 |
| MH-03 | Regra de bem-estar baixo (ex.: humor ≤ X por N dias ou sono < Y h) com os parâmetros em [PENDENTE P-01]. Gera a sugestão “Consider scheduling a private conference with your flight surgeon”. A conferência privada é prática real da NASA (S04). | P1 |
| MH-04 | Interruptor de consentimento “Share wellbeing alerts (not details) with CMO”, controlado pelo astronauta. Cada mudança gera um AuditEntry. | P0 |

### 6.4 Exercício (adesão + gamificação)

| ID | Requisito | Prioridade |
| --- | --- | --- |
| EX-01 | Today’s plan: sessões prescritas por equipamento (ARED, T2, CEVIS) [FATO, S13], somando cerca de 2 h/dia, a média relatada pela NASA [FATO, S13]. A distribuição entre os equipamentos é [SIMULATED]. Rótulo: “Prescribed by ASCR team (simulated).” | P0 |
| EX-02 | Check-in por sessão: done, partial (com minutos) ou skipped. Sempre autorrelato (selfReported: true). | P0 |
| EX-03 | Adesão semanal (%) = minutos feitos ÷ minutos prescritos. | P0 |
| EX-04 | Gamificação em tom profissional (“mission readiness”): sequência de dias cumpridos, anel de progresso semanal e 2 ou 3 conquistas (ex.: “7-day streak”). Sem tom infantil. A própria NASA cita parceiros de treino gerados por software como forma de motivar o exercício em missões longas (S19). | P1 |
| EX-05 | O sistema não prescreve nem altera o plano. Isso é papel dos ASCRs (S04). | P0 (restrição) |

### 6.5 Modo de missão e escalonamento (pronto para EIMO)

Perfis de missão (config/missions.ts):

| Modo | Atraso de ida | Origem do número |
| --- | --- | --- |
| ISS | ~0 s (tratado como quase tempo real) | [DECISÃO] simplificação ilustrativa |
| LUNAR | ~1,3 s | Cálculo físico: distância média Terra–Lua ÷ velocidade da luz [DECISÃO de cálculo] |
| MARS_TRANSIT | 20 min (cenário) | Dentro da faixa de 4 a 24 min citada pela NASA [FATO, S10]. O valor exato é [DECISÃO] |

| ID | Requisito | Prioridade |
| --- | --- | --- |
| ESC-01 | Seletor de missão na TopBar. Ao trocar, o painel de comunicação e o texto de escalonamento mudam. | P0 |
| ESC-02 | Escalonamento por nível (motor de regras): normal → nenhum; attention → notifica o CMO e coloca um pacote na fila para o solo; urgent → notifica o CMO imediatamente e coloca um pacote prioritário na fila. | P0 |
| ESC-03 | O painel de comunicação mostra o tempo estimado de resposta do solo = 2 × atraso de ida. Em Marte: “Ground reply in ~40 min. Follow these safe actions now.” | P0 |
| ESC-04 | Fila store-and-forward visível, com resumo do pacote e status queued → sent → reply-received. Os tempos podem ser acelerados no modo demo, com o rótulo “time-accelerated for demo”. | P0 |
| ESC-05 | Interruptor “Comm blackout” em Marte: os pacotes ficam queued até o fim do apagão. Apagões de até 2 a 3 semanas são citados pela NASA [FATO, S10, S11]. | P1 |

### 6.6 Assistente (opção C: WebLLM + fallback roteirizado)

Interface comum (padrão Strategy):

```ts
interface AssistantContext {          // montado pelo motor de regras, nunca pela LLM
  missionMode: MissionMode;
  activeAlerts: Alert[];
  vitalsSummary: { kind: VitalKind; deviationPct: number; status: AlertLevel }[];
  activeEvent?: SpaceWeatherEvent;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  engine?: 'onboard-model' | 'protocol';   // qual motor gerou (para o rótulo)
  at: string;
}

interface AssistantEngine {
  readonly mode: 'onboard-model' | 'protocol';
  init(onProgress?: (p: number, text: string) => void): Promise<void>;
  reply(ctx: AssistantContext, history: ChatMessage[], userText: string): Promise<string>;
}
```

| ID | Requisito | Prioridade |
| --- | --- | --- |
| AI-01 | ProtocolEngine (determinístico): árvore de perguntas por cenário (evento solar, desvio de vital, check-in diário) e templates com números preenchidos a partir do contexto. Precisa funcionar 100% sozinho. | P0 |
| AI-02 | OnboardModelEngine: WebLLM rodando num Web Worker (para não travar a interface). Modelo candidato: Llama-3.2-1B-Instruct-q4f32_1-MLC [PENDENTE P-03], a confirmar na lista de modelos pré-compilados do WebLLM e na licença. | P0 |
| AI-03 | Seleção do motor: usa protocol se ?ai=protocol estiver na URL, se navigator.gpu não existir ou se init falhar. Também usa protocol para uma mensagem específica se a geração passar do tempo limite (ex.: 20 s [DECISÃO]). Além disso, há um interruptor no painel “Demo controls” para trocar de motor sem recarregar a página, sem perder o estado da demo. | P0 |
| AI-04 | Selo na TopBar e no chat: “AI: onboard model” ou “AI: protocol mode”. Barra de progresso durante o carregamento do modelo. | P0 |
| AI-05 | System prompt (em inglês, em ai/prompts.ts): o assistente só faz perguntas de sintomas e resume os dados recebidos. É proibido diagnosticar, prescrever medicamento ou contradizer os alertas. Ele deve encaminhar ao CMO ou ao flight surgeon quando o alerta for attention ou urgent. Usar temperatura baixa e limite de tokens. | P0 |
| AI-06 | Cada mensagem da IA leva o rótulo “AI-generated — verify with CMO/flight surgeon.” | P0 |
| AI-07 | A LLM nunca altera status, alertas ou escalonamento. Ela só lê o AssistantContext. | P0 (restrição) |
| AI-08 | A lista de sintomas perguntada após o evento de radiação precisa de fonte [PENDENTE P-05]. Até lá, usar uma checagem genérica (“How are you feeling? Any new symptoms?”). | P0 |

### 6.7 Perfis e privacidade

Matriz de acesso:

| Dado | Astronauta | CMO | Flight Surgeon |
| --- | --- | --- | --- |
| Vitais, baseline, gráficos | Sim | Sim | Sim |
| Dose e eventos de radiação | Sim | Sim | Sim |
| Adesão ao exercício | Sim | Sim | Sim |
| Bem-estar detalhado (humor, sono, notas) | Sim | Restrito: só via break-glass | Sim |
| Alerta de bem-estar (sem detalhes) | Sim | Sim só com consentimento (MH-04) | Sim |
| Log de auditoria | Sim | Sim (os próprios acessos) | Sim |

| ID | Requisito | Prioridade |
| --- | --- | --- |
| PRIV-01 | Seletor de perfil na TopBar. Sem login [DECISÃO]. | P0 |
| PRIV-02 | Na visão do CMO, o card de bem-estar aparece bloqueado (“Restricted — private medical data”) com o botão “Emergency access”. | P0 |
| PRIV-03 | O break-glass exige um motivo (texto obrigatório), mostra um aviso de que o acesso será registrado e notificado, revela os dados e cria um AuditEntry. | P0 |
| PRIV-04 | O astronauta e o Flight Surgeon veem a notificação “CMO accessed your wellbeing data — reason: …”. | P0 |
| PRIV-05 | Texto de contexto no ⓘ: as comunicações médicas privadas são tratadas como privadas pela NASA (S02) e seguem a Privacy Act de 1974 (S04). | P1 |

### 6.8 Data & Sources

| ID | Requisito | Prioridade |
| --- | --- | --- |
| SRC-01 | Página “Data & Sources” listando o catálogo de §16: provedor, título, URL, data de acesso, uso no sistema e licença/termos. Critério eliminatório do evento. | P0 |
| SRC-02 | Todo selo REAL ou SIMULATED na tela é clicável e leva à fonte correspondente. | P1 |
| SRC-03 | Agradecimento ao DONKI conforme a política de publicação da CCMC [PENDENTE P-06]. | P0 |

### 6.9 Controles da demo

| ID | Requisito | Prioridade |
| --- | --- | --- |
| DEMO-01 | Painel recolhível “Demo controls”, visualmente separado da interface do produto: Replay solar event, Switch AI engine, Time acceleration (para a fila store-and-forward) e Reset scenario (P0); Advance day (BODY-08) e Phase transition (BODY-09) (P1). | P0 |
| DEMO-02 | Tudo o que é acelerado ou disparado por esse painel aparece com o rótulo “demo” na interface, para não confundir com o comportamento real. | P0 |

## 7. Motor de regras

Funções puras em domain/rules/. Cada regra tem ID, fonte e teste.

| Regra | Entrada → Saída | Base | Teste P0 |
| --- | --- | --- | --- |
| R-VIT-01 | leitura + baseline → desvio % | aritmética | Sim |
| R-VIT-02 | desvio % → normal/attention/urgent | [PENDENTE P-01] (placeholders) | Sim (com placeholders) |
| R-RAD-01 | doses → % do limite de carreira | 600 mSv [S03] | Sim |
| R-RAD-02 | dias de missão → dose da missão | 1,8 mSv/dia [S08, S09] | Sim |
| R-RAD-03 | evento SEP ativo → alerta urgent com o fluxo de abrigo | procedimento Orion [S05] | Sim |
| R-RAD-04 | nível de alerta pela % do limite de carreira | [PENDENTE P-01] | — |
| R-EX-01 | sessões → adesão semanal % | aritmética | Sim |
| R-EX-02 | abrigo ativo → sessões do dia postponed | consequência lógica de R-RAD-03 | Sim |
| R-MH-01 | registros → alerta de bem-estar baixo | [PENDENTE P-01] | — |
| R-ESC-01 | nível + modo de missão → destinatários, ETA (2 × atraso) e pacote | S10, §6.5 | Sim |
| R-PRIV-01 | perfil + consentimento + break-glass → pode ver o dado? | matriz §6.7 | Sim |
| R-BODY-01 | indicadores da zona + perfil + consentimento → status da zona (pior status; restricted para Head na visão do CMO sem consentimento nem break-glass) | §6.1.1, matriz §6.7 | Sim |
| R-PHASE-01 | dias desde a troca de gravidade + status → adapting (substitui só attention; urgent permanece) | S04, S19, P-14 | Sim |

Placeholders de limiares: config/thresholds.ts exporta constantes com o comentário // PENDENTE P-01 — valores ilustrativos. Os testes de R-VIT-02 checam a lógica, não os valores.

## 8. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| NFR-01 | Acessibilidade: meta WCAG 2.2 AA. Contraste adequado no tema escuro, foco visível, navegação por teclado (Radix) e cor nunca como único sinal. |
| NFR-02 | Offline: após npm run build, o app roda com npm run preview sem internet. Única exceção: o primeiro download do modelo da LLM, cujos pesos e biblioteca vêm de servidores externos (ver R-06). Teste obrigatório: carregar uma vez com internet, desligar a rede, recarregar e confirmar que o modelo abre do cache. Se não abrir, o fallback assume. |
| NFR-03 | Desempenho: a LLM roda num Web Worker, e a interface não pode travar durante a geração. Os gráficos recebem no máximo ~120 dias de dados por série. |
| NFR-04 | Qualidade: TS strict, ESLint sem erros, testes Vitest das regras P0 passando antes do pitch. |
| NFR-05 | Proveniência: nenhum número aparece sem o selo REAL ou SIMULATED. |
| NFR-06 | Segurança: nenhuma chave ou segredo no repositório. .env no .gitignore. |
| NFR-07 | Visual: tema escuro estilo “mission control”, sóbrio e clínico. Tipografia IBM Plex Sans mais IBM Plex Mono com algarismos tabulares (DESIGN-SYSTEM v2). Cores de status consistentes (verde, âmbar e vermelho, com ícone e texto). Layout para notebook (≥ 1280 px). Responsivo é P2. |
| NFR-08 | Aviso fixo no rodapé: “Decision-support prototype — not a medical device, not for diagnosis. Some data simulated.” |

## 9. Dados

| Arquivo | Conteúdo | Tipo |
| --- | --- | --- |
| fixtures/astronaut.json | Astronauta fictício, dia de missão (120), dose prévia de carreira e baselines pré-voo | [SIMULATED] |
| fixtures/vitals.json | Pré-voo (~14 dias) e 120 dias em voo de FC, PA, glicemia e temperatura | [SIMULATED], gerado por scripts/generate-fixtures.mjs com semente fixa |
| fixtures/wellbeing.json | 30 dias de humor e sono | [SIMULATED] |
| fixtures/exercise.json | Plano e histórico de 30 dias por equipamento | [SIMULATED] (equipamentos e média de 2 h: S13) |
| nasa/donki-sep-2024-05.json | Resposta integral de GET https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31, consultada em 14/11/2026 | [REAL, S07] |

Regras dos dados:

- Não inventar tendências fisiológicas como fato. As séries sintéticas são ruído em torno do baseline, mais um desvio roteirizado para a demo, rotulado como simulado. Se o time quiser reproduzir efeitos reais do voo, é preciso fonte [PENDENTE P-07].
- Conta de referência da dose no dia 120: 120 × 1,8 = 216 mSv de missão [SIMULATED]. A dose prévia de carreira é fictícia e deve manter o total abaixo de 600 mSv.
- Adaptador de dados: todo acesso aos fixtures passa por data/ com validação Zod. Assim dá para trocar pelos dados de teste do desafio depois [PENDENTE P-08].

## 10. Roteiro da demo (cenário)

> Duração e ordem finais dependem do formato do pitch [PENDENTE P-09].

- Overview (Astronauta, Marte, dia 120): mapa do corpo com as zonas coloridas. Clicar no coração e mostrar o card (função, desvio contra o baseline, hazard, fonte). Mostrar a dose de carreira em X% e os selos REAL e SIMULATED.
- Replay event: o evento real do DONKI (11/05/2024) gera o alerta urgent, o fluxo de abrigo da Orion e o exercício do dia muda para postponed.
- Assistente: pergunta como o astronauta está (WebLLM). Mostrar o selo do modo de IA.
- Escalonamento: painel “Ground reply in ~40 min — safe actions now” e pacote na fila. Trocar para ISS e mostrar a mesma situação com resposta quase imediata. Esse é o diferencial em 10 segundos.
- Perfil CMO: vê vitais, dose e adesão. A cabeça no mapa do corpo fica cinza, com cadeado, e o bem-estar aparece bloqueado. Fazer o break-glass com motivo e mostrar o registro de auditoria.
- Fallback: no painel Demo controls, trocar para protocol mode e mostrar que, sem a LLM, o sistema continua seguro (o semáforo e os alertas não mudam).
- Data & Sources: mostrar as fontes (critério eliminatório).

## 11. Plano de execução

### Prioridade de implementação

- Base: scaffold, tema, AppShell, tipos, store, fixtures e catálogo de fontes.
- Motor de regras P0 com testes.
- Overview + Vitals, Radiation (com evento), Escalation (seletor de missão e fila).
- Wellbeing + Privacy (break-glass), Exercise (check-in e adesão).
- Assistant: ProtocolEngine primeiro, WebLLM depois.
- Data & Sources, polimento visual e ensaio da demo.
- P1, se sobrar tempo: gamificação completa, Log measurement, Today’s measurements, blackout.

### Divisão sugerida (6 pessoas) [DECISÃO do time]

| Pessoa | Frente |
| --- | --- |
| A | Scaffold, design system (tema, tokens, shadcn), AppShell, TopBar, Data & Sources, Demo controls |
| B | Núcleo: Overview, mapa do corpo SVG, cards de vitais, gráficos ECharts |
| C | Radiação: dose, evento DONKI, fluxo de abrigo |
| D | Motor de regras + escalonamento + testes (lógica central, autoria do time) |
| E | Bem-estar + perfis/privacidade + break-glass + auditoria |
| F | Assistente (Protocol → WebLLM) + Exercício/gamificação, se sobrar tempo |

Interdisciplinaridade (critério 3): quem não estiver codando deve cuidar do pitch, do roteiro da demo e da revisão das fontes.

### Marcos (sáb. 14/11 → dom. 15/11)

- Sáb., ~21h30: tipos (types.ts) e contrato do store congelados. Todos programam contra eles.
- Sáb., ~01h: fluxo P0 navegável de ponta a ponta, mesmo feio.
- Dom., manhã: integração, polimento, testes passando, ensaio no notebook do pitch (cache do modelo + teste do ?ai=protocol).
- Congelar o código até ~12h para ter tempo de ensaio completo no notebook do pitch antes da entrega, por volta das 15h.

## 12. Riscos e mitigação

| # | Risco | Mitigação |
| --- | --- | --- |
| R-01 | Time sem fluência em React/TS | Resolvido: o time confirmou fluência (P-02) |
| R-02 | WebGPU indisponível ou modelo lento no notebook do pitch | ProtocolEngine é P0. Testar hoje no notebook real. Usar ?ai=protocol |
| R-03 | LLM pequena gera texto ruim ou impróprio | Escopo limitado (perguntas e resumos), system prompt restritivo, rótulo de IA. A LLM não controla alertas |
| R-04 | Jurado questiona os limiares | Rótulo “Illustrative thresholds” e P-01 explícito no pitch |
| R-05 | Escopo grande demais para a noite | Ordem de prioridade (§11). P1 só depois do fluxo P0 completo |
| R-06 | “Offline” contradito pelo download do modelo | Explicar no pitch: numa missão real, os pesos iriam pré-carregados. No protótipo, o cache é feito antes da apresentação e testado offline (NFR-02) |
| R-07 | Confusão entre dado real e simulado | Selos obrigatórios (NFR-05) e página de fontes |
| R-08 | Simplificação de radiação questionada | Declarar: a taxa do RAD é dose equivalente, usada como aproximação didática da dose efetiva do limite de 600 mSv |
| R-09 | Gamificação parecer infantil | Tom “mission readiness”, poucas conquistas, visual sóbrio |
| R-10 | Projeto parecer “feito por IA” (desclassificação) | Lógica central (D) e decisões (P-01, roteiro) feitas e defendidas pelo time |

## 13. Pendências

| ID | Pendência | Bloqueia? |
| --- | --- | --- |
| P-01 | Limiares do semáforo (vitais, % de dose, bem-estar) e janela do baseline em voo. Decidir entre desvio relativo e faixas clínicas com fonte | Não: placeholders permitem avançar |
| P-02 | Confirmar se o time domina React + TypeScript Resolvida (14/11): sim | — |
| P-03 | Confirmar na documentação do WebLLM: o ID do modelo na lista pré-compilada, a licença do modelo, a API de Web Worker e o comportamento de cache offline | Não |
| P-04 | Fonte para o incremento de dose durante um evento SEP | Não (valor ilustrativo, P1) |
| P-05 | Fonte para os sintomas a perguntar após exposição à radiação | Não (checagem genérica até lá) |
| P-06 | Texto de agradecimento ao DONKI conforme a política da CCMC | Não |
| P-07 | Fontes para efeitos fisiológicos reais do voo, caso o time queira tendências realistas | Não |
| P-08 | Avaliar os dados da aba Resources do desafio para validação | Não |
| P-09 | Formato e duração do pitch | Não |
| P-10 | Horário da entrega Resolvida (14/11): entrega por volta das 15h de domingo | — |
| P-11 | Nome do sistema (<SYSTEM_NAME>) | Não |
| P-12 | Fonte médica para orientações de tratamento específicas nos alertas de vitais e para fluxos guiados de emergência, como dor no peito (BODY-10). Até lá, só ações não clínicas (CORE-09) | Não |
| P-13 | Hazard relacionado à glicemia (zona Torso). Buscar fonte que ligue metabolismo ou nutrição a um dos cinco hazards | Não (card mostra “Related hazard: under review”) |
| P-14 | Janelas de adaptação por indicador após troca de gravidade (só o enjoo de movimento tem média citada, ~3 dias, S04) | Não (BODY-09 é P1) |
| P-15 | Fonte de dados de cabine (CO₂, temperatura do ambiente) para a zona de ambiente | Não (P2) |

## 14. Registro de validação

Revisão feita em 14/11/2026 sobre o rascunho v0.1. Critérios: coerência interna, afirmações com fonte, viabilidade técnica no prazo e aderência ao briefing.

### 14.1 Problemas encontrados e corrigidos

| # | Problema | Correção |
| --- | --- | --- |
| V-01 | O fluxo de abrigo não seguia a ordem real do procedimento da Orion (a tripulação monta o abrigo com as bolsas e depois entra) | RAD-04 reescrito na ordem da fonte e marcado como “adaptado”, porque a nave do cenário é fictícia |
| V-02 | O valor de 1,8 mSv/dia estava atribuído a um artigo cujo texto não foi conferido | Fonte primária passou a ser o S09 (SwRI, texto verificado). S08 virou “artigo original, conferir” |
| V-03 | O limite de 600 mSv é de dose efetiva, e o RAD mede dose equivalente; somar as duas sem aviso é incorreto | Simplificação declarada (R-08) e tooltip com o tipo de radiação |
| V-04 | O DONKI não fornece fluxo nem nível S, e mostrar “S3” seria inventar dado | RAD-07 proíbe exibir o nível S como dado real |
| V-05 | O evento real foi observado perto da Terra, mas o cenário está a caminho de Marte | Rótulo obrigatório: “observed near Earth, replayed in this scenario” (RAD-03) |
| V-06 | “Nada via CDN” contradizia o download dos pesos do WebLLM | Exceção documentada, teste offline obrigatório (NFR-02) e R-06 |
| V-07 | O suporte do WebLLM a Web Worker e ao cache offline e o ID do modelo vieram de fonte secundária | Movidos para a pendência P-03 |
| V-08 | O fallback por ?ai=protocol exigia recarregar a página e perdia o estado no meio do pitch | Interruptor no painel Demo controls (AI-03, DEMO-01) |
| V-09 | O briefing pede orientação de tratamento, mas não havia orientação para os alertas de vitais | CORE-09 com ações não clínicas. Orientação de tratamento real virou P-12 |
| V-10 | MH-02 dizia “apenas” Astronauta e Flight Surgeon, o que contradizia o break-glass do CMO | Texto alinhado à matriz §6.7 |
| V-11 | Os tipos usavam ChatMessage sem defini-lo | Tipo adicionado em §6.6 |
| V-12 | O plano B (sem React) mantinha o shadcn, que depende de React | Plano B explicitado em §5.1 |
| V-13 | Aceleração de tempo e disparo de evento poderiam ser confundidos com comportamento real | Rótulo “demo” obrigatório (DEMO-02) |

### 14.2 Verificações sem problema

| Item verificado | Resultado |
| --- | --- |
| Atraso Terra–Marte de 20 min dentro da faixa de 4 a 24 min (S10); ida e volta de ~40 min | OK |
| Apagão de comunicação de até 2 a 3 semanas (S10, S11) | OK |
| Dose da missão no dia 120 = 120 × 1,8 = 216 mSv | OK (conta conferida) |
| Dia 120 é plausível num trajeto até Marte (o cruzeiro do MSL durou 253 dias, S08) | OK |
| Atraso Terra–Lua de ~1,3 s (≈ 384.400 km ÷ 299.792 km/s ≈ 1,28 s) | OK (cálculo físico) |
| ARED, T2, CEVIS e ~2 h/dia (S13) | OK |
| Pelo menos 2 CMOs por veículo; CMO não precisa ser médico (S02) | OK |
| Autoridade médica do Crew Surgeon; prescrição de exercício pelos ASCRs; conferências privadas (S04) | OK |
| Campos do evento DONKI (sepID, horário, instrumento, eventos ligados, link) conferidos com a resposta real da API | OK |
| Briefing: autoavaliação, indicadores, mapa do corpo, gráficos, cores, gamificação, lembretes, instruções e múltiplos ambientes, todos cobertos (§15) | OK |
| Nenhum segredo necessário (WebLLM roda localmente) | OK |
| A LLM não controla nenhuma decisão de segurança (AI-07, princípio 2) | OK |

### 14.3 O que segue em aberto (não é erro, é decisão)

- P-01 (limiares) é a decisão que mais afeta o resultado. P-02 foi resolvida na v0.2.
- Viabilidade no prazo: o escopo P0 é grande para uma noite. A ordem de §11 garante que, se o tempo acabar, o que sobra é um fluxo completo, não telas pela metade.

### 14.4 Revisão da v0.2 (mapa do corpo)

| # | Problema na ideia original | Correção na spec |
| --- | --- | --- |
| V-14 | Na visão do CMO, a cor da zona da cabeça já revelaria o estado de saúde mental, furando a privacidade | BODY-06: cabeça cinza com cadeado para o CMO, salvo consentimento ou break-glass |
| V-15 | “Adapting” durante a troca de fase poderia esconder um problema real | R-PHASE-01: “Adapting” só substitui attention; urgent nunca é mascarado |
| V-16 | O mapeamento original não tinha glicemia, que é indicador citado no briefing | Zona Torso / metabolic (P0), com o hazard pendente (P-13) |
| V-17 | A ligação temperatura → ambiente hostil não tem fonte direta | Marcada como inferência do time no card (hazardBasis: 'inference') |
| V-18 | Os “dados de cabine” não têm fonte de dados definida | Movidos para P2 (P-15) |
| V-19 | O fluxo guiado de dor no peito seria um protocolo clínico sem fonte | BODY-10 em P2, bloqueado por P-12. A emergência da demo continua sendo o abrigo de radiação, que tem fonte |
| V-20 | Animação de pulso sem cuidado de acessibilidade | BODY-05: frequência abaixo do limite da WCAG 2.3.1 e respeito a prefers-reduced-motion |
| V-21 | O documento da ideia colocava o corpo em P1; nesta spec ele era P0 | Mantido P0 o essencial (zonas e card, sugestão explícita do briefing). Animação, avanço de dias e fases ficam em P1 |
| V-22 | O mapeamento zona → hazard era “proposta, a confirmar” | Conferido na página da NASA The Human Body in Space (S19): cabeça → isolamento, coração → gravidade, pernas → gravidade e overlay de corpo inteiro → radiação confirmados. Glicemia (P-13) e temperatura (inferência) seguem marcadas |

## 15. Rastreabilidade (requisito → fonte)

| Requisito | Fonte |
| --- | --- |
| Foco no astronauta, indicadores, mapa do corpo, gamificação, cores, gráficos, instruções, lembretes de medição | S01 |
| CMO não precisa ser médico, mínimo 2 por veículo, comunicação médica privada | S02 |
| Limite de 600 mSv | S03 |
| Autoridade do Crew Surgeon, ASCRs, conferências privadas, Privacy Act, checklist médico de bordo (CORE-09) | S04 |
| Fluxo de abrigo (1 h para preparar, até 24 h dentro) | S05 |
| Evento solar real | S06, S07 |
| 1,8 mSv/dia | S08, S09 |
| Atraso de 4 a 24 min, apagões | S10, S11 |
| Conceito EIMO / CDSS | S12 |
| ARED, T2, CEVIS, ~2 h/dia | S13 |
| Escala S (apenas explicativa) | S14 |
| Práticas de engenharia inspiradas em norma (sem alegar conformidade) | S16 |
| Mapeamento zona → hazard do mapa do corpo; motivação de exercício por software | S19 |
| Janela de adaptação de ~3 dias para o enjoo de movimento (BODY-09) | S04 |

## 16. Catálogo de fontes (data de acesso: 14/11/2026)

| ID | Provedor | Título | URL | Licença / termos |
| --- | --- | --- | --- | --- |
| S01 | NASA Space Apps | Create Health Monitoring Software for Astronauts on Space Missions | https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=details | Briefing do desafio |
| S02 | NASA OCHMO | NASA-STD-3001, Volume 1, Revision C (2023) | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | Verificar |
| S03 | NASA OCHMO | OCHMO-TB-020 Design for Ionizing Radiation Protection | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf | Verificar |
| S04 | NASA OCHMO | OCHMO-TB-044 Medical Operations (13/08/2025) | https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf | Verificar |
| S05 | NASA | Crew Systems (Orion), seção Radiation Shelter (atualizado em 08/09/2026); Scientists and Engineers Evaluate Orion Radiation Protection Plan | https://www.nasa.gov/reference/crew-systems/ · https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/ | Verificar |
| S06 | NASA GSFC CCMC | CCMC DONKI System (inclui termos de uso) | https://ccmc.gsfc.nasa.gov/tools/DONKI/ | Dados de “qualidade de protótipo” para contexto de pesquisa. O uso não concede licença nem endosso da NASA. Seguir a política de publicação da CCMC |
| S07 | NASA GSFC CCMC | DONKI API, GET /get/SEP; evento 2024-05-11T02:10:00-SEP-001 | https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31 · https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1 | Mesmos termos de S06 |
| S08 | PubMed (Zeitlin et al., 2013) | Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory (PMID 23723233). Conferir o periódico e o valor exato da taxa no artigo antes de citar no pitch | https://pubmed.ncbi.nlm.nih.gov/23723233/ | Artigo: citar, não reproduzir |
| S09 | Southwest Research Institute | SwRI-led team calculates the radiation exposure associated with a trip to Mars | https://www.swri.org/newsroom/press-releases/swri-led-team-calculates-the-radiation-exposure-associated-trip-mars | Citar |
| S10 | NASA NTRS (Robinson et al., IAC-19, 2019) | Innovative Approaches to using the ISS… (atraso de 4–24 min, apagões de até 2 semanas) | https://ntrs.nasa.gov/api/citations/20190032318/downloads/20190032318.pdf | Verificar |
| S11 | NASA NTRS (2025) | Expertise and Training Considerations for Crew… Mars Vicinity (até 22 min, apagão de 3 semanas) | https://ntrs.nasa.gov/api/citations/20250007638/downloads/Crew_Complement_Mars_Vicinity_Final.pdf | Verificar |
| S12 | NASA Ames | A Clinical Decision Support System for Earth-independent Medical Operations (16/04/2024); Russell et al., npj Microgravity 9, 46 (2023) | https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/a-clinical-decision-support-system-for-earth-independent-medical-operations/ · https://doi.org/10.1038/s41526-023-00284-1 | Verificar |
| S13 | NASA | Astronaut Exercise (ARED, T2, CEVIS; média de ~2 h/dia) | https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ | Verificar |
| S14 | NOAA SWPC | GOES Proton Flux; NOAA Space Weather Scales | https://www.swpc.noaa.gov/products/goes-proton-flux · https://www.swpc.noaa.gov/noaa-scales-explanation | Verificar |
| S15 | Google Cloud Blog | How Google and NASA are testing AI for medical care in space (07/08/2025) | https://cloud.google.com/blog/topics/public-sector/how-google-and-nasa-are-testing-ai-for-medical-care-in-space | Contexto para o pitch |
| S16 | ISO / IEC | IEC 62304:2006 Medical device software — Software life cycle processes (confirmada em 2023) | https://www.iso.org/standard/38421.html | Referência; não alegar conformidade |
| S17 | WebLLM / MLC | Documentação oficial; artigo arXiv 2412.15803 | https://webllm.mlc.ai/docs/ · https://arxiv.org/abs/2412.15803 | Verificar a licença da biblioteca e do modelo (P-03) |
| S18 | shadcn/ui | Tailwind v4 (suporte a Tailwind v4 e React 19) | https://ui.shadcn.com/docs/tailwind-v4 | — |
| S19 | NASA Human Research Program | The Human Body in Space (publicado em 02/02/2021, atualizado em 26/05/2026) | https://www.nasa.gov/humans-in-space/the-human-body-in-space/ | Verificar |

## 17. Adendo v0.3 (14/11/2026, noite): modos de ambiente

> Este adendo foi acrescentado depois da v0.2, a pedido do time. Ele **substitui** o seletor de missão da §6.5 (ESC-01) e o tipo `MissionMode` da §5.4. O restante da SPEC continua valendo.

**Ideia:** um **botão de modo de ambiente** com quatro modos, **Earth · Space Station · Moon · Spacecraft**. Ao clicar, a plataforma inteira troca de modo, do mesmo jeito que um botão de tema troca a aparência de um site. **Não é um tema escuro** (o visual escuro do design system não muda). O que muda: a cor da faixa da missão, atraso de comunicação e escalonamento, gravidade (fases), taxa de dose diária, equipamentos de exercício e hazards em destaque. Isso atende ao pedido do briefing de adaptar a ferramenta a vários ambientes [S01].

```ts
type MissionMode = 'EARTH' | 'ISS' | 'LUNAR' | 'SPACECRAFT';   // substitui 'ISS' | 'LUNAR' | 'MARS_TRANSIT'

interface MissionProfile {
  mode: MissionMode;
  label: string;                         // "Earth" | "Space Station" | "Moon" | "Spacecraft"
  oneWayDelaySec: number;
  delayNote: string;
  gravity: 'earth' | 'micro' | 'partial';
  doseRateMSvPerDay: number | null;      // null = sem fonte para este ambiente → não mostrar número (P-16)
  doseRateProvenance?: Provenance;
  exerciseDevices: ExerciseDevice[] | null;   // null = "simulated habitat equipment" (P-18)
  emphasizedHazards: Hazard[];
  themeToken: 'earth' | 'station' | 'moon' | 'spacecraft';
}
```

| Ambiente | Gravidade | Atraso de ida | Taxa de dose diária | Exercício |
| --- | --- | --- | --- | --- |
| Earth (pré-voo e pós-voo) | 1 g | 0 s; flight surgeon acessível direto | não exibir | plano de solo |
| Space Station | microgravidade | ~0 s [DECISÃO] | null (P-16) | ARED, T2, CEVIS, ~2 h/dia [S13] |
| Moon (superfície) | parcial (P-17) | ~1,3 s (cálculo físico) | null (P-16) | null (P-18) |
| Spacecraft (trânsito, cenário a caminho de Marte) | microgravidade | 20 min [S10]; apagões de até 2–3 semanas [S10, S11] | 1,8 mSv/dia [S08, S09] | null (P-18) |

| ID | Requisito | Prioridade |
| --- | --- | --- |
| ENV-01 | Seletor na TopBar com 4 botões (ícone + texto), acessível por teclado. O ambiente fica em `store.environment` e é salvo no localStorage | P0 |
| ENV-02 | A troca é instantânea, não perde o estado da demo e atualiza comunicação, escalonamento, radiação, exercício e o destaque de hazards | P0 |
| ENV-03 | O atributo `data-environment` no `<html>` muda só a cor da faixa da missão (`--color-banner`, ver DESIGN-SYSTEM §5). Os status (verde, âmbar e vermelho, com ícone e texto) não mudam de cor. Contraste AA | P0 |
| ENV-04 | Um ambiente sem fonte para um número não mostra o número ("rate not sourced for this environment") | P0 |
| ENV-05 | O ambiente entra no `AssistantContext` e no `OutboundPacket` | P0 |
| ENV-06 | A troca de gravidade (ex.: Spacecraft → Moon, Spacecraft → Earth) dispara "Adapting" pela R-PHASE-01 (urgent nunca é mascarado) | P1 |

**Regras afetadas:**
- **R-ESC-01:** recebe o ambiente. ETA = 2 × atraso; na Earth, aparece "Flight surgeon available now".
- **R-RAD-02:** dose diária = `doseRateMSvPerDay` do ambiente; se for `null`, não soma número novo e marca o card.
- **R-EX-01:** usa os equipamentos do ambiente.

**Pendências novas:**
- **P-16:** taxa de dose na ISS, na Lua e na Terra.
- **P-17:** fração da gravidade lunar, com fonte.
- **P-18:** equipamentos de exercício fora da ISS.
- **P-19 (resolvida em 14/11):** Spacecraft é a **nave menor em trânsito**. Space Station é a **estação maior**, onde a nave atraca e o astronauta faz manutenção nela.

## 18. Adendo v0.3 (14/11/2026, noite): o que o briefing pede, rotina da missão e design system

**Itens do briefing que o protótipo precisa mostrar com clareza [S01]:**

| Pedido do briefing | Onde atende | Prioridade |
| --- | --- | --- |
| Código de cores para o astronauta entender rápido o estado de cada indicador | CORE-03, BODY-04, StatusBadge do design system (✓ Normal · ▲ Attention · ● Urgent · ◼ Restricted) | P0 |
| Instruções e explicações simples sobre medições, indicadores e riscos | CORE-08 (ⓘ "Why this matters"), BODY-03 (card: Function · How to measure · Why it matters · What to do · Source), card de hazard | P0 |
| Gráficos dinâmicos de como os indicadores mudam com o tempo | CORE-05 (série temporal com baselines) + "Advance day" (BODY-08) | P0 (Advance day: P1) |
| Pedir ao astronauta, de tempos em tempos, medições e atividades específicas como parte da rotina | **ROUT-01…05 (novo, abaixo)** + CORE-06 e CORE-07, que **sobem para P0** | **P0** |

**Rotina da missão e lembretes (novo):**

| ID | Requisito | Prioridade |
| --- | --- | --- |
| ROUT-01 | Agenda do dia por ambiente: lista "Mission routine" com itens programados. Exemplos: medir FC e PA pela manhã, check-in de bem-estar, sessões de exercício e, **na Space Station, a manutenção da Spacecraft**. Horários e itens são `[SIMULATED]` e marcados assim | P0 |
| ROUT-02 | Cada item tem o estado **Due / Overdue / Done / Postponed**, mostrado com texto e ícone **neutros**. Não usa as cores de saúde (Normal/Attention/Urgent), para não confundir rotina com estado de saúde | P0 |
| ROUT-03 | Lembrete dentro do app: quando um item vence, aparece um aviso na faixa da missão ("Time to measure your resting heart rate") com o botão primário **Log measurement**. Sem notificação real do sistema operacional | P0 |
| ROUT-04 | **Log measurement** (era CORE-06, agora P0): formulário com Zod e só limites de plausibilidade de entrada. Ao salvar, o item da rotina vira Done e as regras recalculam o status | P0 |
| ROUT-05 | A aceleração de tempo no Demo controls faz os lembretes vencerem durante a demo, com o rótulo "demo". O abrigo de radiação (RAD-05) passa itens para Postponed | P0 |

**Design system:** [`docs/DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) (PDF em `docs/design/`). É obrigatório em toda tela e substitui o NFR-07 se houver conflito.
- O vermelho da marca é só para ação.
- Status = cor + ícone + texto, com hachura no Urgent.
- Números em mono tabular.
- A faixa da missão muda de cor por ambiente (§17).
