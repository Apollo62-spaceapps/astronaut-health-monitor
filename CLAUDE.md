# CLAUDE.md — Protótipo frontend de monitoramento de saúde de astronautas (Apollo 62, NASA Space Apps 2026)

Contexto para o Claude e para qualquer IA ou pessoa do time.

**Ordem de leitura obrigatória antes de codificar:**
1. Este arquivo.
2. `docs/SPEC-frontend.md`, a fonte de verdade dos requisitos, incluindo os adendos §17 (ambientes) e §18 (rotina e briefing).
3. **`docs/DESIGN-SYSTEM.md`**, obrigatório em qualquer tela.
4. `INSTRUCOES-DE-CODIGO.md` e o seu arquivo em `docs/onboarding/`.

A SPEC foi convertida de `SPEC-frontend.docx` (v0.2 de 14/11/2026). Este arquivo resume o que é preciso para programar sem errar. Cite sempre os IDs da SPEC: CORE-xx, BODY-xx, RAD-xx, MH-xx, EX-xx, ESC-xx, AI-xx, PRIV-xx, SRC-xx, DEMO-xx, R-xxx, NFR-xx e P-xx.

> **Versão 3 (14/11/2026, noite).** Tudo é **frontend prototipado**: sem backend, sem login, sem dados reais de saúde. Time de código: **Kayque (K4yquee)**, **Lucas Batista (lucasba07)** e **Felipe Gabriel (FELIIPE505)**. Entrega: **domingo, ~15h**; o código congela às ~12h.
>
> As versões 1 e 2 (agente Terra → agente de bordo) estão arquivadas em `contexto ia/backup-v2-2026-11-14/`, fora do repositório.

## 0. Regras inegociáveis (ler primeiro)

1. **Protótipo de apoio à decisão, não é dispositivo médico.** O rodapé fixo diz: "Decision-support prototype — not a medical device, not for diagnosis. Some data simulated." (NFR-08).
2. **Nunca "fit", "apto", "healthy", diagnóstico ou prescrição.** Os rótulos são **Normal / Attention / Urgent / Adapting / Restricted** (BODY-07).
3. **As regras decidem e a IA só auxilia.** Cor, alerta e escalonamento vêm do motor de regras determinístico (funções puras em `src/domain/rules/`). A LLM só conversa e resume, e **nunca** altera status, alerta ou escalonamento (AI-07).
4. **Proveniência visível.** Nenhum número aparece sem o selo **REAL** ou **SIMULATED** e a fonte (NFR-05).
5. **Toda afirmação médica ou científica tem fonte do catálogo da §8.** Sem fonte, mostrar "Consult your flight surgeon." Nunca invente limiar, dose, conduta, sintoma ou fonte. Itens marcados [PENDENTE P-xx] na SPEC continuam pendentes até alguém achar a fonte.
6. **Limiares sem fonte** ficam em `src/domain/config/thresholds.ts`, com o comentário `// PENDENTE P-01 — valores ilustrativos`. A UI mostra o selo **"Illustrative thresholds"** (CORE-04).
7. **Status nunca só por cor:** sempre cor + ícone + texto, e hachura nos status não normais do mapa do corpo (CORE-03, BODY-04).
8. **Ações em alertas de vitais são só não clínicas:** "Re-measure", "Notify CMO", "Follow the onboard medical checklist" (CORE-09). Orientação de tratamento exige fonte médica (P-12).
9. **Privacidade por perfil.** O bem-estar (humor e sono) é privado. O CMO só vê com consentimento (apenas o nível do alerta) ou via break-glass auditado (PRIV-03, BODY-06). A matriz de acesso está na SPEC §6.7.
10. **Funciona sem a Terra.** Tudo roda local. Nada via CDN; as fontes tipográficas vêm do `@fontsource`. A **única exceção** são os pesos do modelo WebLLM, baixados uma vez e guardados em cache (NFR-02, R-06).
11. **Interface toda em inglês.** Documentos e conversa do time em português.
12. **Nenhum segredo no repositório** (não há chave de API). O `.env` vai para o `.gitignore`.
13. **Design system obrigatório** (`docs/DESIGN-SYSTEM.md`):
    - use só os tokens dele;
    - o vermelho da marca é só para o botão primário e nunca para status;
    - status = cor + ícone (✓ ▲ ● ◼ ↻) + texto, com hachura no Urgent;
    - números em mono tabular;
    - sentence case.

    Em conflito com a SPEC, vale o design system.
14. **Autoria do time** (risco R-10, de desclassificação por "feito por IA"): a lógica central (motor de regras), os limiares (P-01) e o roteiro da demo são decididos e defendidos pelo time. A IA ajuda, mas não decide sozinha.

## 1. Desafio e proposta

- **Evento:** NASA Space Apps Challenge 2026, Goiânia (13–15/11/2026). Equipe Apollo 62.
- **Desafio:** "Create Health Monitoring Software for Astronauts on Space Missions" [S01].
  - O briefing pede uma ferramenta visual de autoavaliação, com orientação.
  - Cita os 5 hazards do Human Research Program: radiação, isolamento e confinamento, distância da Terra, campos gravitacionais e ambientes hostis e fechados.
  - Cita os indicadores: pressão arterial, frequência cardíaca, glicemia, temperatura, sono e humor.
- **Proposta (SPEC §1):** o astronauta se autoavalia num **núcleo de sinais vitais com baseline individual** e em **três módulos que conversam entre si**:
  - radiação;
  - bem-estar mental;
  - adesão ao exercício.

  O sistema continua funcionando longe da Terra e escalona para o CMO ou para o solo, respeitando quem pode ver cada dado.
- **Diferenciais para o pitch (SPEC §6.1.1, §6.5, §6.7, §17):**
  0. **Um sistema, quatro ambientes.** Um **botão de modo de ambiente** (**Earth · Space Station · Moon · Spacecraft**): ao clicar, a plataforma inteira troca de modo, como um botão de tema troca um site (não é um tema escuro). Muda: a cor da faixa da missão, o atraso de comunicação, o escalonamento, a gravidade, a taxa de dose, os equipamentos de exercício e a rotina. Isso responde ao pedido do briefing de adaptar a vários ambientes [S01]. Veja a §5.1.
  1. **O atraso de comunicação faz parte da interface.** Trocar de ISS para Marte muda o escalonamento ao vivo ("Ground reply in ~40 min — safe actions now"). É o "diferencial em 10 segundos" da demo.
  2. **Privacidade médica real.** A cabeça fica cinza com cadeado para o CMO, e existe break-glass com motivo e auditoria.
  3. **Evento solar real da NASA (DONKI)** reproduzido no cenário, gerando o fluxo de abrigo baseado na Orion.
  4. **Proveniência** REAL/SIMULATED em cada número.
  5. **IA local no navegador** (WebLLM) com **fallback seguro** (protocolo determinístico): sem a LLM, o semáforo não muda.

## 2. Escopo

**P0 (obrigatório para a demo):**
- **Overview com mapa do corpo:** zonas Head, Heart, Torso e Skin, mais o overlay de radiação (CORE-01, BODY-01…04, 06, 07).
- **Cards e gráficos de vitais**, com baseline pré-voo e em voo (CORE-02…05, 08, 09).
- **Radiação:** dose de carreira; evento DONKI real; replay → alerta urgent + fluxo de abrigo; exercício adiado (RAD-01…05, 07).
- **Bem-estar:** check-in, gráfico de 14 dias, consentimento (MH-01, 02, 04).
- **Exercício:** plano, check-in, adesão (EX-01…03, 05).
- **Seletor de ambiente** Earth / Space Station / Moon / Spacecraft. Ele troca o tema e o comportamento do sistema inteiro, e substitui o seletor de missão da SPEC (ENV-01…06, §5.1).
- **Escalonamento:** ETA de 2 × o atraso do ambiente e fila store-and-forward (ESC-02…04).
- **Assistente:**
  - ProtocolEngine, que funciona 100% sozinho;
  - WebLLM num Web Worker, com seleção automática e manual do motor;
  - selos e rótulos de IA (AI-01…08).
- **Perfis e privacidade:** seletor de perfil, bem-estar bloqueado para o CMO, break-glass, notificação (PRIV-01…04).
- **Rotina da missão e lembretes** (SPEC §18; atende ao briefing [S01]):
  - agenda do dia por ambiente, incluindo, na Space Station, a manutenção da Spacecraft;
  - estados Due / Overdue / Done / Postponed com estilo neutro;
  - lembrete na faixa da missão;
  - **Log measurement** (CORE-06) e **Today's measurements** (CORE-07), que agora são **P0** (ROUT-01…05).
- **Data & Sources** (SRC-01, 03) e **Demo controls** (DEMO-01, 02).

**P1 (se sobrar tempo):**
- BODY-05 (animação), BODY-08 (Advance day), BODY-09 + R-PHASE-01 (Adapting) e zona Legs;
- RAD-06, MH-03, EX-04 (gamificação sóbria), ESC-05 (blackout), PRIV-05, SRC-02.

**P2 (só roadmap no pitch):**
- autenticação e backend;
- sensores reais e dados ao vivo NOAA/DONKI;
- faixas clínicas validadas e instrumento validado de saúde mental;
- PWA;
- dados de cabine (P-15);
- fluxo guiado de dor no peito (BODY-10, bloqueado por P-12).

**Ordem de corte (SPEC §11):** completar o fluxo P0 de ponta a ponta antes de qualquer P1. Se o tempo acabar, o que sobra é um fluxo completo, não telas pela metade.

## 3. Stack (decidida em 14/11; versões fixas, todas publicadas há 2+ semanas)

| Camada | Escolha | Versão | Motivo |
|---|---|---|---|
| Build | Vite | 8.3.5 | Template oficial `react-ts` (create-vite 9.3.3) |
| UI | React + TypeScript strict | 19.3.1 / 7.0.2 | Linha estável; o TS strict evita erro de unidade |
| Estilo | Tailwind CSS (`@tailwindcss/vite`) | 4.3.3 | Rápido e consistente |
| Componentes | shadcn/ui (CLI `shadcn@4.23.0`) sobre `radix-ui` 1.8.1, `lucide-react` 1.65.0, `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0 | — | Acessível (teclado e ARIA); suporte a Tailwind v4 e React 19 [S18] |
| Gráficos | **Recharts** | 3.10.1 | **Desvio da SPEC (que pedia ECharts).** Com 2 pessoas: já instalado, API declarativa React, `ReferenceLine` e `ReferenceArea` prontas para os baselines, sem wrapper próprio. Acessibilidade: `accessibilityLayer`, e o status nunca só pela cor |
| Estado | Zustand (store único) | 5.0.16 | Simples |
| Validação | Zod | 4.6.7 | Valida fixtures e entradas |
| Testes | Vitest (+ jsdom e Testing Library) | 4.1.12 / 30.1.3 / 16.3.3 | Testes do motor de regras (P0) |
| LLM | `@mlc-ai/web-llm` num Web Worker + ProtocolEngine | 0.2.87 | No navegador, offline depois do cache, sem chave. Modelo candidato: `Llama-3.2-1B-Instruct-q4f32_1-MLC` (P-03: confirmar o ID, a licença e o cache) |
| Fontes | `@fontsource-variable/inter` + `@fontsource/jetbrains-mono` (algarismos tabulares) | 5.3.0 | Nada via CDN |
| Qualidade | oxlint + Prettier | 1.89.0 / 3.9.10 | **Desvio da SPEC (que pedia ESLint):** o template atual do Vite já traz oxlint |

O alias de import é `@/` → `src/` (exigido pelo shadcn; configurar em `tsconfig.app.json` e `vite.config.ts`).

O visual segue o **`docs/DESIGN-SYSTEM.md`**:
- estilo nasa.gov, escuro e de alto contraste;
- tokens Tailwind v4 (`ground`, `surface`, `banner`, `action`, `link`, `muted`, `normal`, `attention`, `urgent`) definidos no `@theme` do `src/index.css`;
- Inter + JetBrains Mono;
- layout para notebook ≥ 1280 px.

## 4. Arquitetura (SPEC §5.2 e §5.3)

```
src/
  app/              App.tsx, AppShell (Sidebar, TopBar), providers
  features/
    overview/       mapa do corpo, cards de status, alertas ativos
    vitals/         cards e gráficos por indicador (Recharts)
    radiation/      barra de dose, evento DONKI, fluxo de abrigo
    wellbeing/      check-in de humor/sono, bloqueio por perfil, break-glass
    exercise/       plano do dia, check-in, adesão
    assistant/      chat, selo de modo de IA
    environment/    seletor de ambiente (Earth / Space Station / Moon / Spacecraft) e tema por ambiente
    routine/        agenda do dia, lembretes, Log measurement (SPEC §18)
    escalation/     painel de comunicação, fila store-and-forward
    sources/        página Data & Sources
    demo/           painel Demo controls
  domain/
    types.ts        contrato de dados (SPEC §5.4 + §6.6)
    rules/          engine.ts, vitals.ts, body.ts, radiation.ts, exercise.ts, escalation.ts, privacy.ts + *.test.ts
    config/         thresholds.ts (P-01, placeholders), environments.ts (os 4 ambientes, §5.1), bodyZones.ts
  ai/               engine.ts (Strategy), protocol.ts, onboard.ts, onboard.worker.ts, prompts.ts
  data/
    fixtures/       astronaut.json, vitals.json, wellbeing.json, exercise.json   [SIMULATED]
    nasa/           donki-sep-2024-05.json   [REAL, cópia fiel da API]
    schemas.ts      Zod; todo acesso aos fixtures passa por aqui
    sources.ts      catálogo de fontes (§8)
  state/store.ts    Zustand
  components/ui/    gerado pelo shadcn
  lib/              format.ts (unidades, datas), utils.ts (cn)
scripts/
  generate-fixtures.mjs   dados sintéticos com semente fixa
```

**Princípios:**
- A UI só chama o store e as funções puras de `domain/`.
- As regras não importam React.
- A LLM recebe só o `AssistantContext`, que é montado pelas regras, e nunca escreve no store de alertas.

## 5. Contrato de dados e regras

- **Tipos:** exatamente os da SPEC §5.4 e §6.6, em `src/domain/types.ts`. Os principais são:
  - leituras e baseline: `Provenance`, `VitalReading`, `Baseline`;
  - módulos: `WellbeingEntry`, `ExerciseSession`, `RadiationState`, `SpaceWeatherEvent`;
  - missão e perfil: `MissionProfile`, `Role`;
  - status e mapa do corpo: `AlertLevel`, `ZoneStatus`, `BodyZone`;
  - alertas e comunicação: `Alert`, `AuditEntry`, `OutboundPacket`;
  - assistente: `AssistantContext`, `ChatMessage`, `AssistantEngine`.

  **O contrato congela no sábado ~21h30**; depois disso, só muda por combinação entre Kayque e Lucas.
- **Regras P0, com teste** (SPEC §7):
  - R-VIT-01 (desvio %) e R-VIT-02 (nível, placeholders);
  - R-RAD-01 (% de 600 mSv), R-RAD-02 (dias × 1,8 mSv), R-RAD-03 (SEP ativo → urgent + abrigo);
  - R-EX-01 (adesão) e R-EX-02 (abrigo → postponed);
  - R-ESC-01 (nível + missão → destinatários, ETA = 2 × atraso, pacote);
  - R-PRIV-01 (perfil + consentimento + break-glass → pode ver?);
  - R-BODY-01 (pior status da zona; Head restricted para o CMO).
- **Regras P1:** R-PHASE-01 ("Adapting" só substitui attention; urgent nunca é mascarado), R-RAD-04 e R-MH-01.
- **Ambientes:** ver a §5.1. Eles substituem as "missões" ISS/LUNAR/MARS_TRANSIT da SPEC.
- **Dados:**
  - fixtures sintéticos com semente fixa: dia de missão 120, ~14 dias de pré-voo e 120 dias em voo;
  - dose da missão no dia 120 = 120 × 1,8 = 216 mSv;
  - dose prévia fictícia, com o total abaixo de 600 mSv;
  - evento real `2024-05-11T02:10:00-SEP-001` (GOES-P SEISS >100 MeV) [S07], com o rótulo "Real event observed near Earth (NASA DONKI), replayed in this scenario."
  - não inventar tendências fisiológicas como fato: as séries são ruído em torno do baseline mais um desvio roteirizado (P-07).

### 5.1 Botão de modo de ambiente — adendo à SPEC (§17 do `docs/SPEC-frontend.md`)

É um **botão de modo de ambiente** na barra superior: ao clicar, a plataforma inteira troca de modo, do mesmo jeito que um botão de tema troca a aparência de um site. **Não é um tema escuro.** O visual escuro já é o padrão do design system e não muda.

**Como funciona por dentro:**
- `store.environment` guarda o ambiente atual.
- O atributo `data-environment` no `<html>` muda **só a cor da faixa da missão (banner) e o ícone**, conforme o `docs/DESIGN-SYSTEM.md` §5. Os contrastes com branco vão de 9,7:1 a 14:1. A escolha é salva no localStorage.
- **Spacecraft** = a nave menor, em trânsito. **Space Station** = a estação maior, onde a nave atraca e o astronauta faz a manutenção dela (P-19 resolvida).
- O comportamento vem de `src/domain/config/environments.ts`.
- **As regras recebem o ambiente como entrada.** As telas não decidem nada sozinhas.

**Contrato:**
- `type MissionMode = 'EARTH' | 'ISS' | 'LUNAR' | 'SPACECRAFT'`. Isso substitui `'ISS' | 'LUNAR' | 'MARS_TRANSIT'`.
- `MissionProfile` ganha:
  - `gravity: 'earth' | 'micro' | 'partial'`;
  - `doseRateMSvPerDay: number | null` mais `doseRateProvenance`;
  - `exerciseDevices: ExerciseDevice[] | null`;
  - `emphasizedHazards: Hazard[]`;
  - `themeToken`.

| Ambiente (UI) | id | Gravidade | Atraso de ida | Taxa de dose diária | Exercício | Faixa (banner) |
|---|---|---|---|---|---|---|
| **Earth** (pré-voo e pós-voo) | `EARTH` | 1 g | 0 s; flight surgeon acessível direto | não exibir número (fora do escopo) | — (plano de solo) | `#093174` |
| **Space Station** (estação maior; manutenção da Spacecraft) | `ISS` | microgravidade | ~0 s, quase tempo real [DECISÃO, simplificação da SPEC] | `null` → "rate not sourced for this environment" (P-16) | ARED, T2, CEVIS, ~2 h/dia [S13] | `#0B4A5E` |
| **Moon** (superfície) | `LUNAR` | parcial (P-17: confirmar fração e fonte antes de mostrar número) | ~1,3 s (cálculo físico) | `null` (P-16) | `null` → "simulated habitat equipment" (P-18) | `#3A3F45` |
| **Spacecraft** (nave menor em trânsito, cenário a caminho de Marte) | `SPACECRAFT` | microgravidade | 20 min (dentro da faixa de 4–24 min [S10]); apagão de até 2–3 semanas [S10, S11] | **1,8 mSv/dia** (média de cruzeiro do MSL/RAD) [S08, S09] | `null` (P-18) | `#2E1F66` |

**O que muda ao trocar de ambiente:**
- **Comunicação e escalonamento (R-ESC-01):** ETA = 2 × o atraso. Na Terra, aparece "Flight surgeon available now". Na Spacecraft: "Ground reply in ~40 min — follow these safe actions now".
- **Radiação (R-RAD-02):** a dose diária usa a taxa do ambiente. Quando não há fonte para a taxa, não aparece número e o card mostra "rate not sourced for this environment".
- **Gravidade e fases:** trocar de gravidade (ex.: Spacecraft → Moon, ou Spacecraft → Earth no retorno) dispara "Adapting" no mapa do corpo (BODY-09, R-PHASE-01, P1). Urgent nunca é mascarado.
- **Exercício:** os equipamentos e o plano do ambiente. Sem fonte, aparece "simulated".
- **Hazards em destaque:** o card do mapa do corpo destaca o hazard mais relevante do ambiente. Por exemplo, "distance from Earth" na Spacecraft e "gravity fields" na volta à Terra.
- **Visual:** a cor da faixa da missão e o ícone do ambiente. Os status (verde, âmbar e vermelho) e o botão primário **não** mudam de cor entre ambientes.
- **Rotina (SPEC §18):** a agenda do dia muda com o ambiente. Na Space Station, entra a manutenção da Spacecraft.

**Regras novas:**
- **ENV-01:** seletor na TopBar com 4 botões (ícone + texto), acessível por teclado.
- **ENV-02:** a troca é instantânea e não perde o estado da demo.
- **ENV-03:** todo número que depende do ambiente leva o selo REAL ou SIMULATED e a fonte.
- **ENV-04:** um ambiente sem fonte para um número **não** mostra o número.
- **ENV-05:** o ambiente entra no `AssistantContext`.
- **ENV-06:** o tema por ambiente respeita o contraste AA, e os status mantêm as cores.

## 6. Roteiro da demo (SPEC §10)

1. **Overview** (Astronauta, **Spacecraft**, dia 120): o mapa do corpo aparece com as zonas coloridas. Clicar no coração e mostrar o card (função, desvio contra o baseline, hazard, fonte), a dose de carreira e os selos REAL/SIMULATED.
   - **Troca de modo ao vivo:** clicar Earth → Space Station → Moon → Spacecraft no botão de modo de ambiente. O tema, o atraso, o escalonamento, a taxa de dose, o exercício e a rotina mudam na frente dos jurados.
   - **Rotina:** um lembrete vence ("Time to measure your resting heart rate"). Clicar em **Log measurement**, registrar, e o mapa do corpo e o gráfico se atualizam.
2. **Replay event:** o evento DONKI real gera o alerta urgent e o fluxo de abrigo da Orion, e o exercício passa para postponed.
3. **Assistente** (WebLLM), com o selo do modo de IA.
4. **Escalonamento:** na Spacecraft aparece "Ground reply in ~40 min — safe actions now" e o pacote entra na fila. Trocando para Space Station ou Earth, a mesma situação tem resposta quase imediata.
5. **Perfil CMO:** a cabeça fica cinza com cadeado e o bem-estar fica bloqueado. Fazer o break-glass com motivo e mostrar o registro de auditoria.
6. **Fallback:** mudar para o protocol mode. O semáforo e os alertas não mudam.
7. **Data & Sources.**

## 7. Time, tarefas e prazos

- **Kanban:** https://github.com/orgs/Apollo62-spaceapps/projects/3. As tasks são do Kayque, do Lucas e do Felipe.
- **Kayque (K4yquee), tasks K\*:**
  - base, tokens do design system, AppShell e TopBar com a faixa da missão;
  - botão de modo de ambiente (K5);
  - contrato (tipos, store, configs), fixtures, DONKI e catálogo de fontes;
  - comunicação e fila;
  - assistente;
  - ensaio da demo.
- **Lucas Batista (lucasba07), tasks L\*:**
  - motor de regras P0 com testes, incluindo a decisão dos placeholders de P-01;
  - Overview com o mapa do corpo;
  - cards e gráficos de vitais.
- **Felipe Gabriel (FELIIPE505), tasks F\*:**
  - radiação (dose, evento DONKI, abrigo);
  - bem-estar e privacidade (break-glass);
  - exercício;
  - rotina e lembretes, com Log measurement;
  - Data & Sources e Demo controls.
- **Instruções de cada um:** `docs/onboarding/LUCAS.md` e `docs/onboarding/FELIPE.md`.
- **Marcos:**

  | Quando | O quê |
  |---|---|
  | Sáb. ~21h30 | Tipos e contrato do store congelados |
  | Sáb. ~01h | Fluxo P0 navegável de ponta a ponta, mesmo feio |
  | Dom. manhã | Integração, polimento, testes passando, ensaio no notebook do pitch (cache do modelo + `?ai=protocol`) |
  | Dom. ~12h | Código congelado |
  | Dom. ~15h | Entrega |

## 8. Fontes (SPEC §16, acesso em 14/11/2026)

Cite pelo id S01–S19. Os itens marcados "Verificar" precisam ser abertos por alguém do time antes de irem para o pitch.

| ID | Provedor | Título / URL | Termos |
|---|---|---|---|
| S01 | NASA Space Apps | Create Health Monitoring Software for Astronauts on Space Missions — https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=details | Briefing |
| S02 | NASA OCHMO | NASA-STD-3001 Vol. 1 Rev. C (2023) — https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | Verificar |
| S03 | NASA OCHMO | OCHMO-TB-020 Design for Ionizing Radiation Protection — https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf | Verificar |
| S04 | NASA OCHMO | OCHMO-TB-044 Medical Operations (13/08/2025) — https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf | Verificar |
| S05 | NASA | Crew Systems (Orion), Radiation Shelter — https://www.nasa.gov/reference/crew-systems/ · https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/ | Verificar |
| S06 | NASA GSFC CCMC | DONKI System (termos de uso) — https://ccmc.gsfc.nasa.gov/tools/DONKI/ | Dados de qualidade de protótipo; sem endosso; seguir a política da CCMC |
| S07 | NASA GSFC CCMC | DONKI API GET /get/SEP; evento 2024-05-11T02:10:00-SEP-001 — https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31 · https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1 | Termos de S06 |
| S08 | PubMed | Zeitlin et al., 2013, MSL/RAD (PMID 23723233) — https://pubmed.ncbi.nlm.nih.gov/23723233/ | Conferir o valor antes de citar |
| S09 | SwRI | SwRI-led team calculates the radiation exposure associated with a trip to Mars — https://www.swri.org/newsroom/press-releases/swri-led-team-calculates-the-radiation-exposure-associated-trip-mars | Citar |
| S10 | NASA NTRS | Robinson et al., IAC-19 (atraso de 4–24 min; apagões de até 2 semanas) — https://ntrs.nasa.gov/api/citations/20190032318/downloads/20190032318.pdf | Verificar |
| S11 | NASA NTRS | Expertise and Training Considerations for Crew… Mars Vicinity (2025) — https://ntrs.nasa.gov/api/citations/20250007638/downloads/Crew_Complement_Mars_Vicinity_Final.pdf | Verificar |
| S12 | NASA Ames | CDSS for Earth-independent Medical Operations (2024); Russell et al., npj Microgravity 9, 46 (2023) — https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/a-clinical-decision-support-system-for-earth-independent-medical-operations/ · https://doi.org/10.1038/s41526-023-00284-1 | Verificar |
| S13 | NASA | Astronaut Exercise (ARED, T2, CEVIS; ~2 h/dia) — https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ | Verificar |
| S14 | NOAA SWPC | GOES Proton Flux; NOAA Space Weather Scales — https://www.swpc.noaa.gov/products/goes-proton-flux · https://www.swpc.noaa.gov/noaa-scales-explanation | Verificar (só explicativo, RAD-07) |
| S15 | Google Cloud Blog | How Google and NASA are testing AI for medical care in space (07/08/2025) — https://cloud.google.com/blog/topics/public-sector/how-google-and-nasa-are-testing-ai-for-medical-care-in-space | Contexto para o pitch |
| S16 | ISO/IEC | IEC 62304:2006 — https://www.iso.org/standard/38421.html | Referência; não alegar conformidade |
| S17 | WebLLM / MLC | https://webllm.mlc.ai/docs/ · https://arxiv.org/abs/2412.15803 | Verificar as licenças (P-03) |
| S18 | shadcn/ui | Tailwind v4 — https://ui.shadcn.com/docs/tailwind-v4 | — |
| S19 | NASA HRP | The Human Body in Space — https://www.nasa.gov/humans-in-space/the-human-body-in-space/ | Verificar |

**Fontes extras verificadas em 14/11** (podem reforçar o pitch; detalhes em `contexto ia/pesquisa-fontes-2026-11-14.md`):
- **CMO-DA offline em teste em solo** (blog da Red Hat, jun/2026): não há registro de uso em voo.
- **Atraso de até ~22 min e interrupção de 2–3 semanas na conjunção** (NASA NTRS 20220013418).
- **Cabine** (NASA-STD-3001 / OCHMO-TB-002): 18–27 °C e CO2 ≤ 3 mmHg.

Ao usar uma delas, acrescente-a ao `src/data/sources.ts` com um id novo (S20+).

## 9. Pendências que mais pesam (SPEC §13)

- **P-01:** limiares do semáforo e janela do baseline em voo. É decisão do time (Lucas lidera); até lá ficam os placeholders com selo.
- **P-03:** WebLLM (ID do modelo, licença, worker, cache offline). Kayque confirma na documentação antes de integrar.
- **P-05:** sintomas pós-radiação sem fonte, então só a checagem genérica.
- **P-06:** agradecimento ao DONKI conforme a política da CCMC.
- **P-11:** nome do sistema.
- **P-12:** orientação clínica e fluxo de dor no peito. Bloqueado: só ações não clínicas.
- **P-13:** hazard da glicemia. O card mostra "Related hazard: under review".
- **P-16** (novo): taxa de dose diária na Space Station, na Moon e na Earth. Sem fonte, não mostrar número; só a Spacecraft tem fonte (1,8 mSv/dia [S08, S09]).
- **P-17** (novo): fração da gravidade lunar. As páginas da NASA divergem (1/6 vs. outros valores) e a de Marte também (3/8 vs. ~1/3). Confirmar a fonte antes de mostrar o número.
- **P-18** (novo): equipamentos de exercício fora da ISS (Moon e Spacecraft). Sem fonte, mostrar "simulated habitat equipment".
- **P-19** (resolvida em 14/11): Spacecraft é a nave menor em trânsito, e Space Station é a estação maior, onde a nave atraca para manutenção.
