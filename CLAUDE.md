# CLAUDE.md — Monitor de saúde para astronautas (NASA Space Apps 2026, Goiânia)

Este arquivo dá ao Claude o contexto completo do projeto: o que será construído, por que cada decisão foi tomada e de quais fontes cada informação veio. Leia tudo antes de escrever código.

## 0. Regras inegociáveis (ler primeiro)

1. **Protótipo educacional, não é dispositivo médico.** Todo dado é simulado. Toda tela mostra o selo `SIMULADO · protótipo educacional`.
2. **O app nunca diz "apto", "inapto", "doença" nem "diagnóstico".** Ele usa: "dentro do seu normal", "fora do seu normal", "consulte o flight surgeon". Quem decide aptidão é o médico de voo (ver fontes F11 e F12).
3. **Todo passo médico tem fonte.** Se não houver protocolo citado, a tela mostra "Sem protocolo citado — consulte o flight surgeon". **Nunca invente conduta, dose, limiar ou fonte.**
4. **Nunca invente uma fonte.** Só cite documentos da seção 9. Uma proposta anterior citava "NASA HRP – Behavioral Health Guidelines", que **não existe nas fontes lidas**: não use.
5. **A cor (verde/amarelo/vermelho) é decidida por regras determinísticas, nunca por IA.**
6. **O núcleo e a emergência funcionam sem internet.** Nada crítico depende de rede.
7. **Status nunca só por cor:** sempre cor + palavra + ícone.
8. Limiares sem fonte ficam em arquivo de configuração, marcados como `placeholder`, e aparecem na UI como "valor ilustrativo".
9. Idioma da interface: português do Brasil, linguagem leiga (astronautas não são médicos — vídeo da AEB).

## 1. Contexto do desafio

- **Evento:** NASA Space Apps Challenge 2026, edição Goiânia (13 a 15/11/2026). Equipe de 6 pessoas.
- **Desafio:** "Create Health Monitoring Software for Astronauts on Space Missions", autor: Agência Espacial Brasileira (AEB). [F1, F2]
- **Pedido do vídeo da AEB** [F2]: um colega sente dor aguda no peito e desmaia a caminho de Marte. O que fazer? Criar um software que ajude astronautas a avaliar a própria saúde e oriente na emergência. Para cada medição: como fazer, por que importa e o que fazer se o valor não parecer normal. Ir além: lembrar de medir e adaptar a ambientes (nave, estação, base lunar). Explorar o HRP e o OSDR.
- **Indicadores sugeridos pelo desafio** [F1]: pressão arterial, frequência cardíaca, glicemia, temperatura corporal, horas de sono e humor.

### Requisitos oficiais (texto do grupo)
- Check-in curto: sono, humor, FC de repouso, pressão, temperatura, mais 1 ou 2 contextos de cabine.
- Comparação com a linha de base do próprio astronauta e detecção de tendência.
- Status com cor e texto ou ícone, mais o hazard relacionado.
- Caixa "o que fazer", com contramedidas citando a fonte NASA.
- Botão que gera um resumo para o flight surgeon (por causa do atraso de comunicação).
- **Fora:** decisão de trajeto ou duração, controle automático da nave, diagnóstico, login.

## 2. O MVP

**Monitor de saúde offline-first por fases da missão.** Cada tripulante é comparado com o **seu próprio normal** em cada fase da missão. O app funciona sem internet, guia a tripulação numa emergência e usa a conexão só para o que não é urgente.

### Por que este MVP
- **O normal muda de fase.** O trânsito a Marte tem cerca de seis meses em ausência de peso, a superfície tem gravidade parcial e, na volta, a tripulação se readapta. [F5] Uma faixa fixa ignora isso.
- **Sono e humor pesam.** Perda de sono, dessincronização circadiana e sobrecarga de trabalho agravam o isolamento. O diário é usado para avaliar o estado emocional. [F4]
- **Cabine importa.** Temperatura, pressão, iluminação e ruído são fatores de habitabilidade. [F7]
- **Autonomia.** As tripulações precisam lidar com emergências médicas com ajuda mínima do solo, e as mensagens podem levar até 20 minutos em um sentido. [F6]
- **Responde aos requisitos oficiais e ao cenário central do vídeo.**
- **Hipótese nossa, ainda não provada:** o mesmo valor pode significar coisas diferentes para pessoas diferentes. O teste com pessoas verifica isso.

### Por que offline-first (a questão da internet)
- A ISS tem internet via satélites TDRS em banda Ku, mas os astronautas acessam um computador em solo, em Houston, por área de trabalho remota. [F15, F16]
- A conexão só existe quando há contato de rádio em banda Ku [F17]. Um cosmonauta relatou acesso em cerca de 80% do tempo, com períodos sem comunicação. [F18]
- A caminho de Marte, até 20 min de atraso em um sentido. [F6]
- **Decisão:** status, tendência e emergência rodam no aparelho. O resumo ao solo usa a rede quando houver link. IA e APIs externas ficam como extras opcionais e não urgentes.

| Fase | Conexão | Comportamento do resumo ao flight surgeon |
|---|---|---|
| Terra (pré-missão) | Contínua | Enviado na hora |
| Estação | Intermitente | Entra na fila e sai quando o link volta |
| Trânsito a Marte | Atraso de até 20 min por sentido | Enviado com o atraso visível (na demo, comprimido) |

## 3. Escopo

### P0 — mínimo para a demo
1. **Fluxo de emergência** (dor no peito e desmaio): passos guiados em alto contraste, cada um com fonte (seção 6). Funciona sem internet e termina no resumo ao flight surgeon.
2. **Perfil** com exame pré-voo simulado, que define o normal pessoal.
3. **Check-in curto:** sono, humor, FC de repouso, pressão (sistólica e diastólica), temperatura e 1–2 dados de cabine (sugestão: temperatura e ruído da cabine).
4. **Regras sem IA:** verde, amarelo ou vermelho, com texto, ícone e hazard relacionado.
5. **Gráfico de tendência** com a faixa pessoal de fundo e botão para avançar o tempo.
6. **Cartão por indicador:** como medir, por que importa, o que fazer.
7. **Botão de resumo ao flight surgeon**, mostrando o estado da conexão (seção 2).

Ordem de corte se o tempo apertar: (a) dados de cabine → só 1; (b) botão de avançar o tempo → série fixa. **A emergência e o resumo nunca saem.**

### P1 — se houver tempo, nesta ordem
1. Troca de fase com o estado "adaptando" (recalcula o normal após a adaptação).
2. Corpo clicável (zonas coloridas com status e hazard).
3. PWA instalável offline.

### Fora
Login, diagnóstico, "apto para missão", gamificação, IA como núcleo, backend, banco de dados, wearables reais, dose de radiação no P0 (P2: dose acumulada simulada, só depois de confirmar o limite na fonte oficial).

## 4. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Interface | React + Vite + TypeScript | Mais conhecido pelo grupo e bem suportado por ferramentas de IA |
| Estilo | Tailwind CSS | Telas de alto contraste rápidas |
| Gráficos | Recharts | Tendência com faixa de fundo |
| Dados e protocolos | Arquivos JSON em `src/data` | Offline; o revisor de saúde edita sem mexer em telas |
| Estado | Estado do React + localStorage | Sem banco, sem login |
| Testes | Vitest | Garante que as regras dão a cor certa |
| Deploy | Vercel ou GitHub Pages | Link público para os jurados |
| Offline instalável | vite-plugin-pwa (P1) | O build estático já roda sem rede na demo |

Nenhuma chave de API no repositório. Se um dia houver IA na nuvem, a chamada passa por um servidor intermediário, nunca pelo front-end.

## 5. Arquitetura e contratos de dados

```
src/
  core/        regras puras, sem React, com testes (baseline.ts, rules.ts, trend.ts, flow.ts, summary.ts)
  data/        crew.json, phases.json, thresholds.json, hazards.json, cards.json, emergency-flow.json, sources.json
  ui/          Profile/, CheckIn/, Dashboard/, Trend/, Cards/, Emergency/, Summary/
  shared/      types.ts
```

Princípio: **a interface só chama funções puras do `core`; o `core` só lê os JSON de `data`.** Assim as regras são testáveis e o conteúdo médico é revisável à parte.

### Tipos (contrato combinado na primeira hora)
```ts
type Indicator = 'sleep' | 'mood' | 'hr' | 'sys' | 'dia' | 'temp' | 'cabinTemp' | 'cabinNoise';
type PhaseId = 'terra' | 'estacao' | 'transito';
type Status = 'verde' | 'amarelo' | 'vermelho' | 'sem-referencia' | 'adaptando';

interface Reading { indicator: Indicator; value: number; at: string /* ISO */; phase: PhaseId; origin: 'simulado' | 'manual'; }
interface CrewMember { id: string; name: string; preflight: Reading[]; readings: Reading[]; }
interface Phase { id: PhaseId; label: string; connection: 'continua' | 'intermitente' | 'atraso'; delayMinutes: number; adaptationDays: number; }
interface HazardLink { indicator: Indicator; hazard: string; sourceId: string; }
interface Card { indicator: Indicator; how: string[]; why: string; whatToDo: Record<'verde'|'amarelo'|'vermelho', string>; sourceIds: string[]; }
interface EmergencyStep { id: string; title: string; text: string; sourceId: string | null; options?: { label: string; next: string }[]; metronomeBpm?: number; }
interface Source { id: string; title: string; url: string; note?: string; }
```

### Regras (core)
- **Normal pessoal:** média e desvio-padrão das medições da pessoa naquela fase. Antes de existir medições suficientes na fase, usa o pré-voo. Sem medições mínimas: `sem-referencia`.
- **Status por desvio:** distância do valor ao normal pessoal, em desvios-padrão, com piso de desvio por indicador (evita que poucos exames parecidos deixem tudo "fora").
- **Tendência:** amarelo quando o indicador fica fora da faixa pessoal por 3 dias seguidos (regra proposta pelo Erick).
- **Adaptação:** durante `adaptationDays` após a troca de fase, mostrar `adaptando` em vez de alarme; depois, recalcular o normal com as medições da nova fase (ideia da linha de base em camadas, do Lucas).
- **Limites absolutos:** camada que sempre alerta, independentemente do normal pessoal. **Vazia até haver fonte.**
- **Resumo do dia:** qualquer vermelho, ou 2+ amarelos → "sinalizar ao flight surgeon". Nunca "apto".

### Parâmetros — TODOS são placeholders sem fonte clínica
| Parâmetro | Valor inicial | Status |
|---|---|---|
| Mínimo de medições para ter referência | 5 | placeholder |
| Verde | até 2 desvios-padrão | convenção estatística, não clínica |
| Amarelo | de 2 a 3 desvios-padrão | placeholder |
| Vermelho | acima de 3 desvios-padrão | placeholder |
| Piso do desvio | FC 3 bpm; sistólica 5 mmHg; diastólica 4 mmHg; temperatura 0,2 °C; sono 0,5 h; humor 0,5 | placeholder |
| Dias de adaptação por fase | definir com o grupo | placeholder |
| Dias seguidos para tendência | 3 | proposta do grupo |

Mostrar na UI que esses valores são ilustrativos. Revisar com um profissional de saúde.

### Mapa de hazards (proposta nossa, não da NASA)
| Indicador | Hazard do HRP |
|---|---|
| Sono, humor | Isolamento e confinamento [F4] |
| FC, pressão | Campos gravitacionais — circulação [F5, F8] |
| Temperatura corporal, cabine | Ambientes hostis e fechados [F7] |

### Dados simulados
- 2 ou 3 tripulantes com corpos diferentes (ex.: FC de repouso média ~84 bpm em um e ~56 bpm em outro), todos inventados.
- Exame pré-voo com várias medições por pessoa; séries diárias por fase.
- **Cena da demo e do teste:** os dois tripulantes registram o **mesmo valor** de FC; para um está dentro do normal, para o outro está fora.
- Gerar com semente fixa, para a demo ser sempre igual.
- Nenhum número de astronauta real (dados clínicos de astronautas são restritos [F13]).

## 6. Fluxo de emergência (P0)

Cada passo cita a fonte. O que não tem fonte fica como "consulte o flight surgeon".

| # | Passo | Fonte |
|---|---|---|
| 1 | Verificar responsividade, pedir ajuda, acionar resposta de emergência, buscar o DEA | AHA 2025 SBV adulto [F9] |
| 2 | Checar respiração e pulso ao mesmo tempo, em até 10 s | AHA 2025 SBV [F9] |
| 3a | Sem respiração normal e sem pulso: RCP 30 compressões : 2 ventilações, DEA assim que disponível, 100–120 compressões/min (metrônomo a 110) | AHA 2025 SBV [F9]; a taxa 100–120/min foi confirmada só por resumo secundário [F9b] |
| 3b | Respira e tem pulso: monitorar até chegar o suporte | AHA 2025 SBV [F9] |
| 4 | Técnica e contenção em microgravidade | Diretriz DGLRM/ESAM [F10] — **ainda não lida; não detalhar até alguém ler** |
| 5 | Dor no peito com a pessoa consciente: perguntar sobre pressão/aperto/peso, irradiação para braço/pescoço/mandíbula, náusea, palpitações, falta de ar, gatilho por esforço | Diretriz AHA/ACC 2021 de dor torácica [F11b] — feita para pronto-socorro, precisa de adaptação por revisor |
| 6 | Medir FC, PA e temperatura; ECG se houver. **Nunca atrasar a RCP por medições** | Mesma diretriz [F11b] |
| 7 | Gerar o resumo ao flight surgeon, com o atraso de comunicação visível | NASA-STD-3001 §6.2 [F12] |

**Sem fonte, não entra como conduta:** aspirina ou nitroglicerina, posição de recuperação em microgravidade, investigação de síncope, decisão de evacuar ou abortar. Na tela: "consulte o flight surgeon".

Contexto útil para a UI (não é conduta): a página de gravidade cita tontura e desmaio na passagem da ausência de peso para a gravidade [F5]. As tripulações da ISS têm oficiais médicos treinados em ACLS que normalmente não são médicos, e usam um checklist médico com algoritmo baseado na AHA [F14] — o app é complemento, não substituto.

Interface: uma ação por tela, botões grandes, alto contraste, cronômetro visível desde o início, metrônomo sonoro.

## 7. Roteiro da demo (3 min) e teste

**Demo:**
1. Terra: dia normal, conectado.
2. Trânsito: sono e humor se desviam aos poucos; o mesmo valor tem significados diferentes para dois tripulantes; o resumo ao solo sai com atraso.
3. Emergência: colega sente dor no peito e desmaia; o app guia sem depender da Terra.

**Teste com pessoas (critério definido antes, conforme guia do evento [F3]):**
- 5 pessoas de fora do grupo, sem explicação prévia, veem a cena "mesmo valor, dois tripulantes".
- Pergunta: "Quem precisa de atenção hoje, e por quê?"
- Acertamos se ≥ 4 de 5 apontarem o tripulante certo em < 2 min, sem ajuda, e explicarem pela faixa pessoal. Nenhuma pode ler o resultado como diagnóstico ou aprovação para missão.
- Com 5 pessoas, o teste só pega problemas de entendimento; não prova eficácia clínica. Dizer isso no pitch.
- No pitch, deixar claro o que é real e o que é simulado.

## 8. Divisão de tarefas (6 pessoas)

Primeira hora, todos: combinar os tipos da seção 5 (responsáveis: pessoas 1 e 5). A pessoa 6 cria o repositório, o projeto Vite e o deploy.

| Pessoa | Frente | Tasks em ordem |
|---|---|---|
| 1 | Núcleo de regras | Tipos e JSON → normal pessoal por fase → cor + hazard → tendência de 3 dias → testes Vitest |
| 2 | Emergência | Fluxo em JSON com fontes → telas de alto contraste → cronômetro e metrônomo → saída para o resumo |
| 3 | Check-in e cartões | Perfil com normal pessoal → check-in → cartões "como medir / por que importa / o que fazer" → corpo clicável (P1) |
| 4 | Painel e conexão | Painel de status → gráfico de tendência com faixa → avançar o tempo → resumo com conexão, fila e atraso → troca de fase "adaptando" (P1) |
| 5 | Dados e conteúdo | Tripulantes simulados e pré-voo → séries por fase e cena da demo → textos dos cartões com fonte → ler DGLRM/ESAM e achar revisor de saúde → mapa de hazards |
| 6 | Setup, teste e pitch | Repositório e deploy → roteiro e recrutamento → teste e ficha de evidências → slide "real vs simulado" e pitch → PWA (P1) |

Dependências: tipos (pessoa 1) antes de 2, 3 e 4 ligarem dados; cena da demo (pessoa 5) antes do teste (pessoa 6); repositório (pessoa 6) antes de todos.

## 9. Fontes

Cite pelo id. Não use fontes fora desta lista.

**Arquivos do projeto**
- **F1** — Desafio oficial "Create Health Monitoring Software for Astronauts on Space Missions", NASA Space Apps 2026 (PDF): indicadores sugeridos, ferramenta visual, instruções simples, cores, gráficos.
- **F2** — Transcrição do vídeo da AEB (Rodrigo Leonardi): cenário do desmaio, "astronautas não são médicos", como medir/por que importa/o que fazer, lembretes, ambientes, HRP e OSDR.
- **F3** — Guia "MVP e Validação" (Thaynara Mábille, UFG): mapa de suposições, cartão de teste, teste de 5 min, ficha de evidências, real vs simulado.

**NASA Human Research Program**
- **F4** — Isolation and Confinement: https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ — sono, ritmo circadiano, sobrecarga, diário, terapia de luz, HERA (45 dias).
- **F5** — Gravity Fields: https://www.nasa.gov/hrp/hazard-gravity-fields/ — fases de gravidade, fluidos, vestibular, tontura e desmaio na transição.
- **F6** — Distance from Earth: https://www.nasa.gov/hrp/hazard-distance-from-earth/ — autonomia médica, até 20 min de atraso por sentido, HERA com até 5 min.
- **F7** — Hostile/Closed Environments: https://www.nasa.gov/hrp/hazard-hostile-closed-environments/ — temperatura, pressão, iluminação, ruído, micróbios, imunidade (não cita CO2).
- **F8** — Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/ — adaptações cardiovasculares, sono inadequado, riscos comportamentais.
- F8b — 5 Hazards: https://www.nasa.gov/hrp/hazards/ · Space Radiation: https://www.nasa.gov/hrp/hazard-space-radiation/ (sem limites de dose na página) · Ongoing Research: https://www.nasa.gov/hrp/ongoing-hrp-research/ · Collaborate (Standard Measures, MMEA): https://www.nasa.gov/hrp/collaborate-with-hrp/ (não lista as medidas).

**Emergência e operação médica**
- **F9** — AHA 2025, Parte 7, Suporte Básico de Vida do adulto: https://professional.heart.org/en/guidelines-statements/part-7-adult-basic-life-support-2025-american-heart-association-guidelines-forcir0000000000001369 · algoritmo: https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-BLS-Adult-Healthcare-250701.pdf
- F9b — Resumo secundário (taxa 100–120/min): https://journalfeed.org/article-a-day/2025/new-aha-bls-2025-updates/
- **F10** — DGLRM/ESAM, RCP em microgravidade: https://pmc.ncbi.nlm.nih.gov/articles/PMC7607644 (não lida)
- **F11** — NASA NTRS, operações de médicos de voo na ISS e certificação médica: https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20080010877.pdf
- F11b — AHA/ACC 2021, dor torácica (pontos principais): https://acc.org/Latest-in-Cardiology/ten-points-to-remember/2021/10/27/14/06/2021-Guideline-for-Chest-Pain-gl_chestpain
- **F12** — NASA-STD-3001, operações médicas (comunicação médica privada): https://www.nasa.gov/reference/6-0-medical-operations/
- **F13** — NASA NTRS, acesso a dados de astronautas (restrito): https://ntrs.nasa.gov/api/citations/20150020970/downloads/20150020970.pdf
- **F14** — NASA NTRS, algoritmo ACLS do checklist médico da ISS: https://ntrs.nasa.gov/api/citations/20070030123/downloads/20070030123.pdf

**Internet na ISS**
- **F15** — Internet In Space: https://internetinspace.pages.dev/blog/how-astronauts-get-online
- **F16** — IBTimes: https://ibtimes.com/how-do-astronauts-use-internet-space-2571640
- **F17** — DLR: https://www.dlr.de/en/blog/archive/2014/astronauts-and-the-internet-the-final-frontier
- **F18** — Viory (cosmonauta Borisov): https://viory.video/en/videos/x4021_04032024/online-in-orbit-cosmonaut-borisov-gets-on-the-net-aboard-iss-exclusive-

**Outros**
- CSA, monitoramento de radiação (CANS, nêutrons): https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- NASEM, revisão sobre arritmias (sem evidência definitiva de aumento no voo espacial — não exagerar o risco cardíaco no pitch): https://www.nationalacademies.org/read/24953/chapter/7

## 10. Pontos em aberto e não verificado

- Limiares e pisos da seção 5: sem fonte clínica. Precisam de revisor da área da saúde ou rótulo "ilustrativo".
- Faixas de referência populacionais (FC, PA, glicemia, temperatura, sono) **não foram verificadas**; não usar sem conferir em AHA, ADA ou CDC.
- Diretriz DGLRM/ESAM não lida: não detalhar técnica de RCP em microgravidade.
- Limite de dose de radiação: confirmar na fonte oficial antes de qualquer uso (P2).
- Gravidade de Marte: as páginas da NASA divergem (três oitavos vs. cerca de um terço); conferir antes de usar em texto.
- O guia de avaliação encontrado pelo grupo é de 2025; conferir o de 2026.
- Proposta do Erick (IA Phi-3 local via Ollama): fica como extra opcional futuro; nunca decide a cor nem cita fonte por conta própria.

## 11. Origem das ideias (para o pitch)

- **Lucas:** núcleo de regras sem IA, linha de base em camadas, prioridades P0/P1/P2, rótulo SIMULADO.
- **Erick:** estrutura de telas, sistema de cores, tendência de 3 dias, botão de resumo; IA local como extra futuro.
- **Luiz:** tríade por indicador, botão de pânico (emergência no P0), avatar anatômico (P1).
- **Kayque:** fases da missão, cena "mesmo valor, dois tripulantes", teste com critério, o que fica fora.
- **Requisitos oficiais e vídeo da AEB:** check-in, linha de base, hazard, "o que fazer", resumo ao flight surgeon, cenário do desmaio.
