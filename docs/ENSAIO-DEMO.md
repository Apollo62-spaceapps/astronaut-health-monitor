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

**Baixar o modelo uma vez:** aba **Assistant** → **Onboard model**. Espere a barra chegar a 100% e a faixa mostrar "AI: onboard model". São centenas de MB; faça isso no Wi-Fi do evento antes de começar.

## 2. Teste offline (NFR-02), obrigatório

1. Com o `npm run preview` aberto, **desligue o Wi-Fi**.
2. Recarregue a página (F5).
3. Confira se a app abre com as fontes certas (IBM Plex Sans no texto e IBM Plex Mono nos números).
4. Aba **Assistant** → **Onboard model**. O modelo deve abrir do cache, sem baixar de novo.
5. Se não abrir, a tela mostra "protocol mode is active" e nada mais muda: é o fallback. Para a demo, use `http://localhost:4173/?ai=protocol`.

## 3. Roteiro (SPEC §10), com o que deve aparecer

Antes de começar: **Data & Sources → Demo controls → Reset scenario · demo**. Perfil **Astronaut**, ambiente **Spacecraft**.

| # | Ação | Deve aparecer |
|---|---|---|
| 1 | **Overview** | Mapa do corpo; Heart em ▲ Attention (+18% vs baseline); selos SIMULATED/REAL; "Illustrative thresholds" |
| 1a | Clicar no coração (ou Tab + Enter) | Card: Function · Indicator (84 bpm vs baseline) · Related hazard · What to do · Source |
| 1b | Botão de ambiente: Earth → Space Station → Moon → Spacecraft | A faixa muda de cor; a janela de resposta vai de "Flight surgeon available now" a ~2,6 s e a 40 min; na dose, "rate not sourced" fora da Spacecraft; no exercício, ARED/T2/CEVIS só na Space Station; a rotina muda (manutenção da Spacecraft na Space Station) |
| 1c | Lembrete na faixa → **Log measurement** → salvar 84 | O item da rotina vira Done; o mapa e o gráfico se atualizam |
| 2 | **Radiation → Replay event · demo** | ● Urgent com os 3 passos do abrigo da Orion; "Real event observed near Earth (NASA DONKI), replayed in this scenario."; rotina e exercício em Postponed |
| 3 | **Assistant**: perguntar "How am I doing?" | Resposta com o rótulo "AI-generated — verify with CMO/flight surgeon."; selo do modo de IA |
| 4 | **Comms** na Spacecraft → Send summary to ground | "Ground reply in ~40 min"; pacote na fila. Trocar para Space Station/Earth: resposta quase imediata |
| 4a | *(opcional, K9)* Ligar **Comm blackout · demo** na Comms | A faixa mostra "Comm blackout · no ground link"; o pacote fica "Queued — held until the blackout ends". Desligar: a fila volta a andar [S10, S11] |
| 5 | Perfil **CMO** → Overview e Wellbeing | Head cinza com cadeado (◼ Restricted); "Restricted — private medical data" → **Emergency access** → motivo → dados aparecem + entrada no **Audit log** |
| 5a | Voltar para **Astronaut** → Wellbeing | "CMO accessed your wellbeing data — reason: …" e a entrada no Audit log |
| 6 | **Data & Sources → Demo controls → Switch to protocol mode · demo** | Faixa "AI: protocol mode"; alertas e cores **não mudam** |
| 7 | **Data & Sources** | Tabela S01–S19 com URLs e termos; agradecimento ao DONKI |
| 7a | *(opcional, K9)* Clicar num selo `REAL · DONKI` (Radiation) | Abre Data & Sources com a linha S07 destacada. Na Wellbeing, **Why is this private?** mostra o texto com [S02] e [S04] |

## 4. Varredura final (já automatizada)

`npm test` roda `src/app/demoSweep.test.tsx`, que confere em todas as telas:
- o rodapé "Decision-support prototype — not a medical device…";
- que não aparece "fit", "healthy", "apto" nem diagnóstico;
- que há no máximo um botão vermelho por tela;
- os passos 5 e 5a do roteiro e o exercício por ambiente.

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
| Estado bagunçado no meio da demo | Data & Sources → Demo controls → **Reset scenario · demo** |
| Notebook sem internet | Tudo roda local depois do build; só o primeiro download do modelo precisa de rede (R-06) |
