# Instruções para construção do código

Guia para o Kayque e o Lucas, com ou sem ferramenta de IA.

- **Requisitos (fonte de verdade):** [docs/SPEC-frontend.md](docs/SPEC-frontend.md). Cite os IDs da SPEC (CORE-02, R-VIT-02…) em commits e PRs.
- **Contexto e regras:** [CLAUDE.md](CLAUDE.md).
- **Kanban:** https://github.com/orgs/Apollo62-spaceapps/projects/3 (aba "Minhas tasks").

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
| Fontes | `@fontsource-variable/inter` + `@fontsource/jetbrains-mono` |
| Qualidade | oxlint + Prettier |

As versões são **fixas** no `package.json`. Não atualize nem adicione biblioteca sem combinar entre vocês dois.

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
| `src/app/`, `src/components/ui/`, `src/lib/` | AppShell, TopBar, Sidebar, tema, componentes shadcn | Kayque |
| `src/domain/types.ts`, `src/state/store.ts`, `src/domain/config/` | Contrato de dados, store, missões, zonas do corpo, limiares | Kayque cria e congela às ~21h30; depois, só mudar combinando entre os dois |
| `src/domain/rules/` (+ `*.test.ts`) | Motor de regras | **Lucas** |
| `src/features/overview/`, `src/features/vitals/`, `src/features/exercise/` | Mapa do corpo, cards e gráficos de vitais, exercício | **Lucas** |
| `src/features/radiation/`, `escalation/`, `wellbeing/`, `assistant/`, `sources/`, `demo/` | Radiação, comunicação e fila, bem-estar e privacidade, assistente, fontes, controles da demo | Kayque |
| `src/ai/` | ProtocolEngine, WebLLM, prompts | Kayque |
| `src/data/`, `scripts/` | Fixtures, DONKI, schemas Zod, catálogo de fontes | Kayque |

**Integração entre as frentes:** as telas do Kayque consomem as regras do Lucas, e as telas do Lucas leem o store do Kayque. Enquanto uma regra não estiver pronta, use uma função temporária com a **mesma assinatura** (`// TODO(Lucas): trocar pela regra real`).

---

## 4. Decisões já tomadas

- **Tipos:** os mesmos da SPEC §5.4 e §6.6, sem renomear. Se precisar de campo novo, combine primeiro.
- **Status:** `AlertLevel` = `normal | attention | urgent`. O mapa do corpo usa `ZoneStatus` = `AlertLevel | adapting | restricted`. A zona mostra o **pior** status dos indicadores dela (R-BODY-01).
- **Missões** (`config/missions.ts`):
  - ISS: ~0 s;
  - LUNAR: ~1,3 s;
  - MARS_TRANSIT: 20 min.

  O ETA de resposta do solo é **2 × o atraso de ida**.
- **Radiação:**
  - dose da missão = dias × 1,8 mSv [S08, S09];
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
- **Visual:** tema escuro "mission control", notebook ≥ 1280 px, Inter + mono com algarismos tabulares, verde/âmbar/vermelho sempre com ícone e texto.

---

## 5. Fluxo de git (2 pessoas)

1. **Pegue a task** no kanban e mova para **Em andamento**.
2. **Crie a branch a partir da `main` atualizada.** O nome é `kayque/ID-descricao` ou `lucas/ID-descricao`.
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
   - PR que mexe em `src/domain/` precisa da revisão do outro;
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
  2. o texto da issue;
  3. os trechos da SPEC citados pela issue;
  4. o `src/domain/types.ts`.

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
- [ ] Status com cor + ícone + texto; teclado e foco funcionam.
- [ ] A LLM não altera alerta, status nem escalonamento.
- [ ] Nada via CDN; nenhum segredo.
- [ ] O PR tem `Closes #N`.
