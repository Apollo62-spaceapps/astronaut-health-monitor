# Instruções para construção do código

Guia para o Kayque, o Lucas e o Felipe, com ou sem ferramenta de IA.

**Antes de codificar qualquer coisa, leia nesta ordem (sempre):**
1. [CLAUDE.md](CLAUDE.md): regras inegociáveis e contexto.
2. [docs/SPEC-frontend.md](docs/SPEC-frontend.md): requisitos, incluindo os adendos §17 (ambientes) e §18 (rotina e briefing). Cite os IDs (CORE-02, R-VIT-02, ROUT-03…) em commits e PRs.
3. **[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md): obrigatório em toda tela.** Cores, tipografia, componentes e o que não fazer.
4. Este arquivo e o seu guia pessoal: [docs/onboarding/LUCAS.md](docs/onboarding/LUCAS.md) ou [docs/onboarding/FELIPE.md](docs/onboarding/FELIPE.md).

**Kanban:** https://github.com/orgs/Apollo62-spaceapps/projects/3 (aba "Minhas tasks").

**O que já está pronto e como usar:** [docs/JA-PRONTO.md](docs/JA-PRONTO.md) (store, tipos, componentes, dados e onde colocar o seu código).

**O que é:** um **protótipo frontend navegável** para o pitch. Não tem backend, login nem dado real de saúde. A interface é **toda em inglês**.

---

## 1. Regras que não se quebram

1. **Não é dispositivo médico.** O rodapé fixo diz: "Decision-support prototype — not a medical device, not for diagnosis. Some data simulated."
2. **Nunca "fit", "apto", "healthy", diagnóstico ou prescrição.** Os rótulos são Normal / Attention / Urgent / Adapting / Restricted.
3. **As regras decidem e a IA só conversa.** Cor, alerta e escalonamento vêm de `src/domain/rules/` (funções puras). A LLM só lê o `AssistantContext` e **nunca** muda o store de alertas.
4. **Todo número mostra o selo REAL ou SIMULATED** e a fonte.
5. **Nada médico ou científico sem fonte do catálogo** (S01–S19). Sem fonte, mostre "Consult your flight surgeon." Não invente limiar, sintoma, dose nem conduta.
6. **Limiar sem fonte** fica em `src/domain/config/thresholds.ts`, com o comentário `// PENDENTE P-01 — valores ilustrativos`. A UI mostra o selo "Illustrative thresholds".
7. **Status = cor + ícone + texto**, nunca só a cor.
8. **Alertas de vitais só com ações não clínicas:** "Re-measure", "Notify CMO", "Follow the onboard medical checklist".
9. **Privacidade:** o bem-estar é privado. O CMO só vê com consentimento (apenas o nível do alerta) ou via break-glass com motivo, registrado em auditoria.
10. **Nada via CDN** (fontes via `@fontsource`). A única exceção são os pesos do modelo WebLLM, que ficam em cache.
11. **Nenhum segredo** no repositório.
12. **Design system:**
    - use só os tokens de `docs/DESIGN-SYSTEM.md`;
    - vermelho de marca só no botão primário, nunca para status;
    - status com ícone (✓ ▲ ● ◼ ↻) + texto, e hachura no Urgent;
    - números em `font-mono tabular-nums`;
    - sentence case.

---

## 2. Stack e como rodar

| Camada | Ferramenta |
|---|---|
| Build e UI | Vite 8 + React 19 + TypeScript 7 (strict) |
| Estilo e componentes | Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react |
| Gráficos | Recharts 3 (linhas de baseline com `ReferenceLine`) |
| Estado | Zustand 5 (store único em `src/state/store.ts`) |
| Validação | Zod 4 (fixtures e formulários) |
| Testes | Vitest 4 (regras P0) |
| IA | WebLLM num Web Worker + ProtocolEngine determinístico |
| Fontes | `@fontsource-variable/ibm-plex-sans` + `@fontsource/ibm-plex-mono` |
| Qualidade | oxlint + Prettier |

As versões são **fixas** no `package.json`. Não atualize nem adicione biblioteca sem combinar com o time.

**Pré-requisitos:** Node.js 22 ou 24 (no mínimo 20.19) e Git. No Windows, clone **fora do OneDrive** (ex.: `C:\dev`) e prefira o Git Bash.

```bash
git clone https://github.com/Apollo62-spaceapps/astronaut-health-monitor.git
cd astronaut-health-monitor
npm install
npm run dev        # desenvolvimento
npm test           # testes (uma vez)
npm run lint       # oxlint
npm run build      # versão final
npm run preview    # serve a versão final em http://localhost:4173 (modo offline da demo)
```

Para testar o assistente sem a LLM, abra a URL com `?ai=protocol`.

---

## 3. Organização e quem mexe onde

A estrutura completa está na SPEC §5.3. O resumo:

| Pasta | O que tem | Dono |
|---|---|---|
| `src/app/`, `src/components/ui/`, `src/lib/`, `src/index.css` (tokens) | AppShell, TopBar e faixa da missão, Sidebar, tokens do design system, componentes shadcn | Kayque |
| `src/domain/types.ts`, `src/state/store.ts`, `src/domain/config/` | Contrato de dados, store, **ambientes** (`environments.ts`), zonas do corpo, limiares | Kayque cria e congela às ~21h30; depois, só mudar combinando entre os três |
| `src/features/environment/` | Seletor de ambiente (Earth / Space Station / Moon / Spacecraft) e tema por ambiente | Kayque |
| `src/domain/rules/` (+ `*.test.ts`) | Motor de regras | **Lucas** |
| `src/features/overview/`, `src/features/vitals/` | Mapa do corpo, cards e gráficos de vitais | **Lucas** |
| `src/features/radiation/`, `wellbeing/`, `exercise/`, `routine/`, `sources/`, `demo/` | Radiação, bem-estar e privacidade, exercício, rotina e lembretes (Log measurement), fontes, controles da demo | **Felipe** |
| `src/features/escalation/`, `assistant/` | Comunicação e fila, assistente | Kayque |
| `src/ai/` | ProtocolEngine, WebLLM, prompts | Kayque |
| `src/data/`, `scripts/` | Fixtures, DONKI, schemas Zod, catálogo de fontes | Kayque |

**Integração entre as frentes:** as telas do Kayque e do Felipe consomem as regras do Lucas, e todas as telas leem o store e os componentes comuns do Kayque. Enquanto uma regra não estiver pronta, use uma função temporária com a **mesma assinatura** (`// TODO(Lucas): trocar pela regra real`).

---

## 4. Decisões já tomadas

- **Tipos:** os mesmos da SPEC §5.4 e §6.6, sem renomear. Se precisar de campo novo, combine primeiro.
- **Status:** `AlertLevel` = `normal | attention | urgent`. O mapa do corpo usa `ZoneStatus` = `AlertLevel | adapting | restricted`. A zona mostra o **pior** status dos indicadores dela (R-BODY-01).
- **Botão de modo de ambiente** (SPEC §17, `config/environments.ts`). Ao clicar, a plataforma inteira troca de modo, como um botão de tema troca a aparência de um site. **Não é um tema escuro**: o visual escuro do design system não muda. `MissionMode` = `EARTH | ISS | LUNAR | SPACECRAFT`.

  | Ambiente | Gravidade | Atraso de ida | Dose/dia | Exercício |
  |---|---|---|---|---|
  | Earth | 1 g | 0 s ("Flight surgeon available now") | não exibir | plano de solo |
  | Space Station | micro | ~0 s | sem fonte → não mostrar (P-16) | ARED, T2, CEVIS [S13] |
  | Moon | parcial (P-17) | ~1,3 s | sem fonte (P-16) | "simulated habitat equipment" (P-18) |
  | Spacecraft (trânsito a Marte) | micro | 20 min [S10] | 1,8 mSv [S08, S09] | "simulated" (P-18) |

  - O ETA de resposta do solo é **2 × o atraso de ida**.
  - **As regras recebem o ambiente como entrada.** As telas leem o resultado e não decidem nada.
  - O `data-environment` no `<html>` muda só a cor da faixa da missão (banner). Os status mantêm verde, âmbar e vermelho, com ícone e texto.
  - Um número sem fonte para o ambiente não aparece.
- **Radiação:**
  - dose diária = taxa do ambiente (só a Spacecraft tem fonte: 1,8 mSv [S08, S09]);
  - limite de carreira = 600 mSv [S03];
  - o evento real é `2024-05-11T02:10:00-SEP-001` [S07].
  - **Nunca** mostrar nível S1–S5 como dado real (RAD-07).
- **Fixtures:** são gerados por `scripts/generate-fixtures.mjs` com semente fixa, e todo acesso passa pelos schemas Zod em `src/data/schemas.ts`. O dia da missão na demo é **120**.
- **Tempo da demo:** tudo que é acelerado ou disparado pelo painel "Demo controls" recebe o rótulo "demo" na tela.
- **Assistente** (padrão Strategy, com `AssistantEngine`):
  - o `ProtocolEngine` é P0 e funciona sozinho;
  - o `OnboardModelEngine` (WebLLM) entra depois;
  - o motor `protocol` é usado com `?ai=protocol`, sem `navigator.gpu`, se o `init` falhar ou se passar de 20 s;
  - cada mensagem da IA leva o rótulo "AI-generated — verify with CMO/flight surgeon."
- **Visual:** segue o `docs/DESIGN-SYSTEM.md`, e o layout de referência é a tela da página 2 do PDF. Notebook ≥ 1280 px.
- **Ambientes:** Spacecraft é a nave menor em trânsito. Space Station é a estação maior, onde a nave atraca e o astronauta faz a manutenção dela.
- **Rotina (SPEC §18):**
  - agenda do dia por ambiente;
  - estados Due / Overdue / Done / Postponed, com estilo **neutro** (nunca as cores de saúde);
  - lembrete na faixa da missão;
  - **Log measurement** é o botão primário e salva via Zod;
  - a regra recalcula o status.

---

## 5. Fluxo de git (3 pessoas)

1. **Pegue a task** no kanban e mova para **Em andamento**.
2. **Crie a branch a partir da `main` atualizada.** O nome é `kayque/ID-descricao`, `lucas/ID-descricao` ou `felipe/ID-descricao`.
   ```bash
   git switch main && git pull
   git switch -c lucas/L1-regras-vitais
   ```
3. **Faça commits pequenos, só com os seus arquivos** (nunca `git add .`). Cite os IDs da SPEC:
   ```bash
   git status
   git add src/domain/rules/vitals.ts src/domain/rules/vitals.test.ts
   git commit -m "L1: R-VIT-01/R-VIT-02 desvio % e nível (placeholders P-01)"
   git push -u origin lucas/L1-regras-vitais
   ```
4. **Antes do PR**, rode `npm test`, `npm run lint` e `npm run build`. Os três precisam passar.
5. **Abra o PR** com `Closes #N` na descrição e mova o card para **Em revisão**.
6. **Revisão:**
   - PR que mexe em `src/domain/` precisa da revisão de outra pessoa (de preferência o Lucas, dono das regras);
   - PR só de tela pode ser mergeado pelo autor, se os três comandos passaram.
7. **Merge:** use **Squash and merge** e mova o card para **Feito**.

**Para atualizar a sua branch com a `main`:**
```bash
git fetch origin && git merge origin/main --no-edit && git push
```
Se abrir o editor Vim, digite `:wq` e aperte Enter.

---

## 6. Usando IA

- **Claude Code** lê o `CLAUDE.md` sozinho. Peça: "Faça a issue #N seguindo a SPEC (docs/SPEC-frontend.md) e o INSTRUCOES-DE-CODIGO.md".
- **ChatGPT, Gemini ou Copilot gratuitos:** antes de pedir código, cole:
  1. a seção 1 e a seção 4 deste arquivo;
  2. **as seções 1, 2, 3 e 6 do `docs/DESIGN-SYSTEM.md`** (tokens, tipografia, componentes, faça e não faça);
  3. o texto da issue;
  4. os trechos da SPEC citados pela issue;
  5. o `src/domain/types.ts`.

**Regras:**
- Leia o código antes de commitar.
- A IA não pode inventar fonte, limiar ou conduta, nem mudar o `types.ts` sem combinar.
- **A lógica do motor de regras e a decisão dos limiares (P-01) são do time** (risco R-10): use a IA para digitar, não para decidir.

---

## 7. Checklist do PR

- [ ] Atende os critérios de aceite da issue e os IDs da SPEC citados.
- [ ] `npm test`, `npm run lint` e `npm run build` passam.
- [ ] Interface em inglês; nenhum "fit", "healthy", diagnóstico ou prescrição.
- [ ] Todo número tem selo REAL ou SIMULATED; o que é médico ou científico tem fonte S01–S19 ou mostra "Consult your flight surgeon."
- [ ] Status com cor + ícone + texto (hachura no Urgent); teclado e foco funcionam.
- [ ] Segue o `docs/DESIGN-SYSTEM.md`: só tokens dele; vermelho só no botão primário; números em mono tabular.
- [ ] A LLM não altera alerta, status nem escalonamento.
- [ ] Nada via CDN; nenhum segredo.
- [ ] O PR tem `Closes #N`.
