# Ensaio da demo e congelamento (K8 #50)

Checklist para o **notebook do pitch**. Siga na ordem. Cada passo diz o que deve aparecer na tela; se não aparecer, anote e avise no grupo antes das 12h.

## 1. Preparar o notebook (com internet)

```bash
git clone https://github.com/Apollo62-spaceapps/astronaut-health-monitor.git
cd astronaut-health-monitor
npm ci
npm test            # tudo verde (inclui a varredura das 9 abas × 3 perfis × 4 ambientes)
npm run build
npm run preview     # abre em http://localhost:4173
```

> **Windows:** rode a partir de `C:\...` com a letra do drive **maiúscula**. Com `c:\` minúsculo, o Vitest mostra "0 test".

**Baixar o modelo uma vez (opcional):** aba **Orbit** → Engine → **Load onboard model**. Espere a barra chegar a 100%. São centenas de MB; faça isso no Wi-Fi do evento antes de começar.

## 2. Teste offline (NFR-02), obrigatório

1. Com o `npm run preview` aberto, **desligue o Wi-Fi**.
2. Recarregue a página (F5).
3. Confira se a app abre com as fontes certas (IBM Plex Sans no texto e IBM Plex Mono nos números).
4. Aba **Assistant** → **Onboard model**. O modelo deve abrir do cache, sem baixar de novo.
5. Se não abrir, a tela mostra "protocol mode is active" e nada mais muda: é o fallback. Para a demo, use `http://localhost:4173/?ai=protocol`.

## 3. Roteiro (SPEC §10), com o que deve aparecer

Antes de começar: botão **Demo** (tracejado, no canto da tela) → **Reset scenario · demo**. Ambiente **Spacecraft**.

> Desde 15/11 (decisão do time), a app mostra **só a visão do astronauta**: saíram as abas Routine e Comms e o seletor de perfil. O lembrete com **Log measurement** e a janela de resposta do solo continuam na faixa da missão.

| # | Ação | Deve aparecer |
|---|---|---|
| 1 | **Overview** | Mapa do corpo; Heart em ▲ Attention (+18% vs baseline); selos SIMULATED/REAL; "Illustrative thresholds" |
| 1a | Clicar no coração (ou Tab + Enter) | Card: Function · Indicator (84 bpm vs baseline) · Related hazard · What to do · Source |
| 1b | Botão de ambiente: Earth → Space Station → Moon → Spacecraft | A faixa muda de cor; a janela de resposta do solo vai de "Flight surgeon available now" a ~2,6 s e a 40 min (o diferencial em 10 segundos); na dose, "rate not sourced" fora da Spacecraft; no exercício, ARED/T2/CEVIS só na Space Station |
| 1c | Lembrete na faixa → **Log measurement** → salvar 84 | O lembrete some; o mapa e o gráfico se atualizam |
| 2 | **Radiation → Replay event · demo** | ● Urgent com os 3 passos do abrigo da Orion; "Real event observed near Earth (NASA DONKI), replayed in this scenario."; exercício em Postponed |
| 3 | **Orbit**: perguntar "How am I doing today?" e depois "why?" | Resposta em texto corrido com as fontes no texto e "Consulted onboard"; o "why?" aprofunda o mesmo assunto. No modo protocolo: "Rule-based response · Protocol mode" |
| 4 | **Wellbeing** → check-in → **Why is this private?** | Gráfico de 14 dias; consentimento "Share wellbeing alerts (not details) with CMO"; o texto de privacidade com [S02] e [S04]; o Audit log registra a mudança de consentimento |
| 5 | **Orbit** → Engine: **Use protocol mode instead** (se o modelo estiver carregado) | Alertas e cores **não mudam** |
| 6 | **Data & Sources** | Tabela S01–S28 com URLs e termos; "How Orbit works"; agradecimento ao DONKI |
| 6a | *(opcional)* Clicar num selo `REAL · DONKI` (Radiation) | Abre Data & Sources com a linha S07 destacada |

**Fala do pitch para o que saiu da tela:** a privacidade do CMO (cabeça com cadeado, break-glass auditado) e a fila ao solo com apagão continuam no código e nos testes (`demoSweep.test.tsx`, `blackout.test.tsx`) e podem ser citadas como "já implementado, fora da demo".

## 3b. Pitch de 3 minutos: o que clicar em cada bloco (atualizado 15/11, L7b)

Antes: **Demo → Reset scenario · demo**, ambiente **Spacecraft**, aba **Overview**. Use `?ai=protocol` (resposta instantânea, sem GPU).

| Tempo | Bloco | No app | O que a banca vê |
|---|---|---|---|
| 0:00–0:35 | Problema | (fala) | — |
| 0:35–1:15 | Solução multiambiente | Botão de modo: **Earth → Moon → Spacecraft** | A faixa, o fundo e a resposta do solo mudam ("Flight surgeon available now" → ~2,6 s → ~40 min). Aba **Baseline**: referência pessoal por ambiente, com a origem de cada número |
| 1:15–1:35 | Passo 1 · leitura visual | **Overview** (mapa do corpo) e **Vitals** (gráfico com "Your normal range") | Cor + ícone + texto; tendência no tempo |
| 1:35–1:50 | Passo 2 · prevenção e adesão | Lembrete na faixa (**Log measurement**) e aba **Exercise** (sequência e conquistas) | Rotina e gamificação das contramedidas |
| 1:50–2:10 | Passo 3 · autoatendimento guiado | **Demo → Simulate abnormal heart rate · demo**, depois **Orbit** (botão no canto ou tecla **A**) → "What should I do now?" | Orbit escreve a resposta, mostra **Step by step**, cita **[S04] [S19]** e "Consulted onboard: …" (a base local de passagens da NASA) |
| 2:10–2:25 | Passo 4 · relatório para a Terra | Overview → **Ground report** (ou no Orbit: "Prepare the ground report") | Relatório completo em poucos kB (o tamanho aparece no topo), com fontes; **Queue for the ground** |
| 2:25–3:00 | Arquitetura | Data & Sources → **How Orbit works** | Três camadas: regras determinísticas, base local com citações (edge RAG), modelo de bordo opcional só para o texto; humano no controle |

**Cuidados de fala (regras do projeto, CLAUDE.md §0):**
- Não dizer "diagnóstico" (nem "diagnóstico visual"): use **"leitura visual imediata"**. O app nunca diagnostica.
- "Recalibra os parâmetros por ambiente" → diga **"reconstrói a referência pessoal em cada ambiente"**. Não existe correção fisiológica com fonte por ambiente (a tela diz "No sourced shift"); os limiares são ilustrativos (P-01).
- "Edge RAG consulta exclusivamente a base da NASA" é verdade para a base local de passagens, cada uma com a fonte do catálogo. O modelo de bordo (WebLLM) é **opcional** e só reescreve o texto; na demo use o protocolo.
- Sono e humor: autorrelato, não instrumento validado. Nada de "apto", "saudável" ou "readiness" como julgamento de saúde (as Standard Measures da NASA não definem isso, [S28]).
- "Eventos cardiovasculares" → prefira **"alterações cardiovasculares"** (o app não prevê evento).
- Biossensores: fale como **intenção futura** (o check-in diário é o formulário de entrada hoje).

## 4. Varredura final (já automatizada)

`npm test` roda `src/app/demoSweep.test.tsx`, que confere em todas as abas:
- o rodapé "Decision-support prototype — not a medical device…";
- que não aparece "fit", "healthy", "apto" nem diagnóstico;
- que há no máximo um botão vermelho por tela;
- o exercício por ambiente e as regras de privacidade (break-glass → auditoria), direto no store.

Conferência manual (olho): todo número visível tem selo REAL ou SIMULATED.

## 5. Congelar às 12h

```bash
git checkout main && git pull
npm ci && npm test && npm run build
git tag -a demo -m "Código congelado para o pitch (Space Apps 2026)"
git push origin demo
```

Depois da tag, só entra correção de bug que quebre a demo, combinada no grupo.

## 6. Se algo der errado na hora

| Problema | Saída |
|---|---|
| Sem WebGPU ou o modelo não carrega | `?ai=protocol` na URL. É o fallback planejado (AI-03): "sem a LLM, o semáforo não muda" |
| Estado bagunçado no meio da demo | Botão **Demo** → **Reset scenario · demo** |
| Notebook sem internet | Tudo roda local depois do build; só o primeiro download do modelo precisa de rede (R-06) |
