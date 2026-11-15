# Guia do Felipe Gabriel (FELIIPE505) — radiação, bem-estar, exercício, rotina, fontes e demo

Você faz as telas dos módulos que **conversam com o núcleo de vitais**. As cores e os alertas vêm das regras do Lucas (`src/domain/rules/`): **as telas nunca decidem status**.

> **Já está pronto na `main`:** K1 a K5 (projeto base, contrato, dados, componentes, botão de modo). Veja **[`docs/JA-PRONTO.md`](../JA-PRONTO.md)**: onde colocar o seu código, store, tipos, componentes e dados.

## 1. Leia antes (nesta ordem)
1. [`CLAUDE.md`](../../CLAUDE.md): §0 regras inegociáveis, §5.1 ambientes.
2. [`docs/SPEC-frontend.md`](../SPEC-frontend.md), nas seções das suas tasks:
   - §6.2 radiação;
   - §6.3 bem-estar;
   - §6.4 exercício;
   - §6.7 privacidade;
   - §6.8 fontes;
   - §6.9 demo;
   - §16 catálogo de fontes;
   - **§18 rotina e briefing**.
3. **[`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md)**, obrigatório em toda tela.
4. [`INSTRUCOES-DE-CODIGO.md`](../../INSTRUCOES-DE-CODIGO.md): git, checklist e uso de IA.

## 2. Preparar
```bash
# fora do OneDrive, ex.: C:\dev
git clone https://github.com/Apollo62-spaceapps/astronaut-health-monitor.git
cd astronaut-health-monitor
npm install
npm run dev
```

## 3. Suas tasks (nesta ordem)

| # | Task | Depende de | Prazo |
|---|---|---|---|
| [#59](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/59) | **F1** · Criar a rotina da missão com lembretes e **Log measurement** (ROUT-01..05) | K2, K4, L1 | dom 01h |
| [#45](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/45) | **F2** · Criar o módulo de radiação com o evento solar real e o abrigo (RAD-01..05, 07) | K3, K4, L2 | dom 01h |
| [#56](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/56) | **F3** · Criar o módulo de exercício com o plano do dia e a adesão (EX-01..03, 05) | K3, L2 | dom manhã |
| [#47](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/47) | **F4** · Criar o bem-estar com privacidade e acesso de emergência auditado (MH-01/02/04, PRIV-02..04) | K4, L1 | dom manhã |
| [#49](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/49) | **F5** · Criar a página de fontes e o painel de controles da demo (SRC-01/03, DEMO-01/02) | K3 | dom manhã |
| [#60](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/60) | **F6** (extra) · Gamificação sóbria e alerta de bem-estar baixo | F3, F4 | só depois do P0 |

O número da task é a ordem: faça F1 → F2 → F3 → F4 → F5, e a F6 só se sobrar tempo.

**Enquanto as regras do Lucas não entram:** use uma função temporária com a **mesma assinatura** e o comentário `// TODO(Lucas): trocar pela regra real`.

## 4. Seus arquivos
- `src/features/radiation/`, `wellbeing/`, `exercise/`, `routine/`, `sources/` e `demo/`.
- **Não edite** `src/domain/` nem `src/state/store.ts` sem falar com o Kayque ou o Lucas.

## 5. Regras que mais importam no seu trabalho

**Radiação**
- **Nunca** mostrar nível S1–S5 como dado real.
- O evento real leva o rótulo "Real event observed near Earth (NASA DONKI), replayed in this scenario".
- O abrigo leva o rótulo "Adapted from NASA Orion radiation shelter procedure".
- A dose diária depende do ambiente: só a **Spacecraft** tem número (1,8 mSv). Nos outros ambientes, mostrar "rate not sourced for this environment".

**Bem-estar e privacidade**
- É dado **restrito**. O CMO não vê sem consentimento (aí só o nível do alerta) ou sem break-glass (motivo obrigatório + `AuditEntry`).
- O texto obrigatório é "Self-report, not a clinical assessment".

**Exercício**
- O sistema **não prescreve** nem altera o plano.
- Durante o abrigo, as sessões ficam "postponed — shelter active".

**Rotina**
- Os estados Due / Overdue / Done / Postponed usam estilo **neutro**, nunca as cores de saúde.
- O lembrete aparece na faixa da missão.
- **Log measurement** é o botão primário (vermelho do design system) e valida com Zod.
- **Na Space Station**, a agenda inclui a manutenção da Spacecraft (simulada).

**Data & Sources**
- É **critério eliminatório** do evento: cada fonte S01–S19 precisa de provedor, título, URL, data de acesso, uso e termos.

**Visual (para todas as tarefas)**
- Todo número com selo REAL ou SIMULATED.
- Use `StatusBadge` e `MetricCard`.
- Números em `font-mono tabular-nums`.
- Interface em inglês.

## 6. Pronto quando
- `npm test`, `npm run lint` e `npm run build` passam.
- O PR tem `Closes #N`, os IDs da SPEC e o checklist do `INSTRUCOES-DE-CODIGO.md` §7.
- PR só de tela pode ser mergeado por você mesmo se os três comandos passarem.

Dúvida? Fale com o Kayque no grupo. Travou por mais de 30 min, avise.
