# Instruções para construção do código

Guia para todos do time, com ou sem ferramenta de IA. Leia antes de abrir a primeira branch.

- **Kanban (tasks):** https://github.com/orgs/Apollo62-spaceapps/projects/3 (aba "Minhas tasks").
- **Contexto completo do produto:** [CLAUDE.md](CLAUDE.md). Este guia é o resumo prático para programar.

---

## 1. Regras que não se quebram

1. **Protótipo educacional, não é dispositivo médico.** Todo dado é simulado. Toda tela mostra o selo `SIMULADO · protótipo educacional`.
2. **O app nunca escreve "apto", "inapto", "doença" ou "diagnóstico".** Ele usa "dentro do seu normal", "fora do seu normal" e "consulte o flight surgeon".
3. **Nunca invente fonte, dose, conduta ou limiar.** Todo texto médico cita uma fonte da §9 do `CLAUDE.md`, pelo id (`F4`, `F9`…). Os ids ficam em `src/data/sources.json`. Sem fonte, a tela mostra "Sem protocolo citado — consulte o flight surgeon".
4. **A cor do status vem de regras fixas no código**, nunca de IA.
5. **Funciona sem internet.** O app não busca nada na rede: nada de `fetch`, CDN ou fonte tipográfica externa (Google Fonts etc.). Mostrar o link de uma citação na tela é permitido.
6. **Status nunca só por cor:** sempre cor + palavra + ícone.
7. **Limiar sem fonte** fica em `thresholds.json` marcado `placeholder` e aparece na tela como "valor ilustrativo".
8. **Interface em português do Brasil, linguagem leiga.** Astronautas não são médicos.

---

## 2. Stack

| Camada | Ferramenta |
|---|---|
| Interface | React + Vite + TypeScript |
| Estilo | Tailwind CSS |
| Gráficos | Recharts |
| Dados e protocolos | Arquivos JSON em `src/data` |
| Estado | Estado do React + localStorage (sem banco, sem login, sem servidor) |
| Testes | Vitest |
| Deploy | Vercel ou GitHub Pages (automático a partir da `main`) |

Pré-requisitos: **Node.js 22 ou 24** (no mínimo 20.19; confira com `node -v`) e **Git**.

### Como rodar

Disponível depois que a task #1 entrar na `main`.

```bash
git clone https://github.com/Apollo62-spaceapps/astronaut-health-monitor.git
cd astronaut-health-monitor
npm install
npm run dev        # servidor de desenvolvimento; abra o endereço que aparecer no terminal
npm test           # roda os testes uma vez (modo contínuo: npx vitest)
npm run build      # gera a versão final
npm run preview    # serve a versão final em http://localhost:4173 (modo usado na demo offline)
```

**No Windows:**
- Prefira o **Git Bash**.
- No PowerShell, se o npm der erro de "execução de scripts desabilitada", rode uma vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Clone **fora do OneDrive** (ex.: `C:\dev`), porque a sincronização trava o `node_modules`.

---

## 3. Como o código é organizado

```
src/
  shared/   types.ts (contrato de dados), contexto global, componentes comuns
  core/     regras puras, sem React: baseline.ts, rules.ts, trend.ts, flow.ts, summary.ts
  data/     JSON: crew, phases, thresholds, indicators, hazards, cards, emergency-flow, sources
  ui/       uma pasta por tela: Profile, CheckIn, Dashboard, Trend, Cards, Emergency, Summary, Scene, Body
scripts/    gerador de dados simulados
docs/       documentos do time (cena da demo, leituras, teste com pessoas, revisão de saúde)
```

**Princípio:** a tela só chama funções do `core`, e o `core` só lê os JSON de `data`. Assim as regras são testáveis e o conteúdo médico é revisado separado das telas.

### Quem mexe onde

Cada frente edita só os próprios arquivos. Isso evita conflito de merge.

| Frente | Arquivos |
|---|---|
| 0 · Fundação (Kayque) | estrutura e configs do projeto, CI, deploy, `src/shared/`, rotas, `src/data/indicators.json`, `thresholds.json`, `phases.json`, `hazards.json`, `sources.json`, `docs/teste-*.md` |
| 1 · Núcleo de regras | `src/core/baseline.ts`, `rules.ts`, `trend.ts`, `summary.ts` e os testes deles |
| 2 · Emergência | `src/core/flow.ts`, `src/data/emergency-flow.json`, `src/ui/Emergency/` |
| 3 · Check-in, perfil e cartões | `src/ui/CheckIn/` (inclui o serviço de leituras `readings.ts`), `src/ui/Profile/`, `src/ui/Cards/`, `src/ui/Body/`, `docs/leitura-F10.md` |
| 4 · Painel, tendência e conexão | `src/ui/Dashboard/`, `src/ui/Trend/`, `src/ui/Summary/`, `src/ui/Scene/` |
| 5 · Dados e conteúdo | `scripts/`, `src/data/crew.json`, `src/data/cards.json`, `docs/cena-demo.md`, `docs/revisao-saude.md` |

- **Precisa mudar algo fora da sua área?** Abra uma issue ou fale com o dono do arquivo. Depois da revisão de saúde (#39), as mudanças em `thresholds.json` e `emergency-flow.json` saem em PR revisado pelo dono (Kayque e frente 2).
- **`src/shared/types.ts` é o contrato de todos.** Ele só muda por PR pequeno e separado, revisado pelo Kayque.

---

## 4. Decisões já tomadas

Não reinvente nenhuma delas.

**Tipos.** O `src/shared/types.ts` (#2) parte da §5 do `CLAUDE.md`, com estas mudanças. Elas valem desde já, mesmo antes do #2 entrar:
- `Phase` ganha `startDay` (dia da missão em que a fase começa).
- `HazardLink` usa `sourceIds: string[]` e `proposal: true` (o mapa de hazards é proposta do grupo).
- `Card` tem fonte por campo, `sources: { how: string[]; why: string[]; whatToDo: Record<'verde'|'amarelo'|'vermelho', string[]> }`, no lugar de `sourceIds`.
- `EmergencyStep` ganha `reviewNote?: string`.
- Tipos novos: `IndicatorMeta`, `Thresholds`, `BaselineResult`, `StatusResult`, `TrendResult`, `DailySummary`, `FlightSurgeonReport`, `EmergencyLogEntry`, `QueueItem`.

**Tempo e fase.**
- O contexto global (#4) já tem `crewId`, `simDay` (dia simulado), a fase e `linkUp` (conexão com o solo), com seus setters. Use esses campos. Não crie estado paralelo nem edite o provider.
- A fase é **derivada** de `simDay` e do `startDay` de cada fase. Não existe seletor manual de fase.
- Use sempre `simDay`, **nunca** `new Date()` nem a data do sistema.

**Dados.**
- Humor vai de 1 a 5. As unidades de todos os indicadores estão em `indicators.json`.
- Limiares e pisos são sempre lidos de `thresholds.json`, nunca escritos no código.
- Toda chave de localStorage começa com `demo:` e usa o helper de `src/shared`. `resetDemo()` limpa tudo.
- **Leituras de saúde** só passam pelo serviço de leituras (#24). Painel, gráfico e perfil leem por ele e nunca importam `crew.json` direto.

**Componentes prontos (#4).** Use estes em vez de criar os seus.

| Componente | Para quê |
|---|---|
| `StatusBadge` | status com cor + palavra + ícone |
| `IndicadorStatus` | indicador + valor + status + hazard + link para o cartão |
| `ValorIlustrativo` | etiqueta "valor ilustrativo"; use sempre que `placeholderUsed` for `true` |
| `FonteCitada` | mostra a fonte pelo id; lista vazia → "Sem protocolo citado — consulte o flight surgeon" |

Palavras do `StatusBadge`:

| Status | Palavra |
|---|---|
| verde | "dentro do seu normal" |
| amarelo | "um pouco fora do seu normal" |
| vermelho | "bem fora do seu normal · consulte o flight surgeon" |
| sem-referencia | "sem referência ainda" |
| adaptando | "adaptando à nova fase" |

**Dependências.**
- O resumo ao flight surgeon tem um esboço (stub) em `src/core/summary.ts` desde o #2. Use as assinaturas dele; o núcleo troca pela versão real depois.
- **Esperando a task de outra pessoa?** Use dados falsos (mock) com o formato do `types.ts` e troque quando a task entrar.

---

## 5. Regras de código

**Núcleo (`src/core`)**
- Funções puras: recebem dados e devolvem resultado. Nada de React, localStorage, `fetch` ou data do sistema.
- Toda regra nova vem com teste Vitest.

**Telas (`src/ui`)**
- Nunca calcule status na tela; chame o `core`.
- Textos médicos (como medir, o que fazer, passos da emergência) nunca ficam no componente. Eles moram em `cards.json` e `emergency-flow.json`, com as fontes.
- Use Tailwind. Mantenha alto contraste, botões grandes e foco visível no teclado.

**Nomes**
- Código (variáveis, funções, tipos) em inglês, seguindo o `types.ts`.
- Ids que já estão no contrato ficam como estão (`'verde'`, `'terra'`, `'estacao'`…).
- Textos da interface em português.

**Proibido**
- Chave de API ou senha no repositório.
- Buscar qualquer coisa na internet (rede, CDN, fonte tipográfica externa).
- Biblioteca nova sem combinar no grupo.
- Usar dados de astronautas reais.

---

## 6. Passo a passo de uma task

**1. Pegue a task** no kanban e mova para **Em andamento**. Confira se as tasks em "Depende de" já estão prontas; se não, use mock.

**2. Atualize a `main` e crie a sua branch.** O nome é `frente/ID-descricao`, sem acento. Os prefixos são `fundacao`, `nucleo`, `emergencia`, `checkin`, `painel` e `dados`. O ID (K1, N1, E1, C1, D1, S1…) está no começo do título da issue.

```bash
git switch main
git pull
git switch -c nucleo/N1-normal-pessoal
```

**3. Programe só nos seus arquivos.** Faça commits pequenos e adicione só os seus arquivos, nunca `git add .`:

```bash
git status                                                # veja o que mudou
git add src/core/baseline.ts src/core/baseline.test.ts   # só os seus arquivos
git commit -m "N1: calcula média e desvio por fase"
git push -u origin nucleo/N1-normal-pessoal               # só na primeira vez; depois, só git push
```

Não commite `package.json` nem `package-lock.json`, a não ser que você tenha adicionado uma biblioteca combinada com o grupo. Se eles mudaram sozinhos, desfaça com `git restore package.json package-lock.json`.

**4. Antes do PR**, rode `npm test` e `npm run build`. Os dois precisam passar.

**5. Abra o Pull Request no GitHub.**
- Na descrição, escreva `Closes #N`, onde `N` é o número da issue.
- Mova o card para **Em revisão**.

**6. Peça revisão** a alguém de outra frente. O revisor confere o checklist da seção 8.

**7. Faça o merge** com "Squash and merge". A issue fecha sozinha por causa do `Closes #N`. **Mova o card para Feito.**

**Se a `main` mudou enquanto você trabalhava**, traga as novidades para a sua branch:

```bash
git fetch origin
git merge origin/main --no-edit
git push
```

- Se abrir uma tela de texto estranha (é o editor Vim), digite `:wq` e aperte Enter.
- Se der conflito num arquivo que não é seu, não resolva no chute: chame o dono do arquivo.

---

## 7. Usando IA (qualquer uma, ou nenhuma)

Cada issue foi escrita para ser autossuficiente: dá para programar só com o texto dela, sem IA.

**Claude Code** lê o `CLAUDE.md` sozinho. Peça: "Faça a issue #N seguindo o CLAUDE.md e o INSTRUCOES-DE-CODIGO.md".

**ChatGPT, Gemini, Copilot ou outra IA gratuita** não conhece o projeto. Antes de pedir código, cole:

1. As seções 1 e 4 deste arquivo.
2. O texto completo da issue.
3. O conteúdo de `src/shared/types.ts`. Se o #2 ainda não entrou, cole a §5 do `CLAUDE.md`: as mudanças em relação a ela já estão na seção 4 deste guia.
4. O arquivo que você vai editar, se ele já existir.

Modelo de pedido:

```
Projeto: app React + Vite + TypeScript + Tailwind, sem internet, sem servidor.
Regras e decisões: [cole as seções 1 e 4 do INSTRUCOES-DE-CODIGO.md]
Contrato de tipos: [cole src/shared/types.ts]
Tarefa: [cole o texto da issue]
Faça só o que a tarefa pede, só nos arquivos: [liste os arquivos].
Não invente fonte, dose, conduta nem limiar. Não adicione biblioteca nova.
Inclua testes Vitest quando for código do src/core.
```

**Cuidados com qualquer IA:**
- Leia e entenda o código antes de commitar. Quem responde pelo PR é você.
- Rode os testes e abra o app para conferir.
- Confira se a IA não mexeu em arquivo de outra frente nem no `types.ts`.
- Confira se a IA não escreveu número, conduta ou fonte que não está na issue. IA costuma inventar isso.

---

## 8. Checklist do PR

- [ ] Faz o que os critérios de aceite da issue pedem.
- [ ] `npm test` e `npm run build` passam.
- [ ] Só mexeu nos arquivos da sua frente (ou combinou antes); `package-lock.json` não mudou sem motivo.
- [ ] Nenhum "apto", "inapto", "doença" ou "diagnóstico" na interface.
- [ ] Todo texto médico tem fonte da §9 do `CLAUDE.md` (id que existe em `sources.json`) ou mostra "Sem protocolo citado — consulte o flight surgeon".
- [ ] Nenhum limiar escrito no código; limiar placeholder mostra "valor ilustrativo".
- [ ] Status com cor + palavra + ícone.
- [ ] Funciona com a internet desligada.
- [ ] Selo `SIMULADO · protótipo educacional` visível nas telas novas.
- [ ] Descrição do PR com `Closes #N`.

---

## 9. Prioridade e prazo

- **Primeiro, o que trava o teste com pessoas** (até domingo de manhã):

  | O quê | Issues |
  |---|---|
  | Base do app e CI | #1 a #5 |
  | Normal pessoal, cor do status e tendência | #11, #12, #13 |
  | Serviço de leituras | #24 |
  | Dados e cena da demo | #36, #37 |
  | Painel e tela "mesmo valor, dois tripulantes" | #31, #32 |
  | Preparação do teste | #6 |

- **Depois, o resto do essencial para a demo:** emergência, resumo ao flight surgeon, check-in, perfil, gráfico e cartões.
- **Tasks com "(Extra)" no nome** só começam quando o essencial estiver pronto. Se não der tempo, ficam de fora.
- **Travou por mais de 30 minutos?** Avise no grupo.
