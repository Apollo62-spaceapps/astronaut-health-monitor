# Guia do Lucas Batista (lucasba07) — motor de regras, mapa do corpo e vitais

**Você é o dono da lógica central do produto.** A SPEC pede que essa lógica seja do time, não de uma IA (risco R-10): use IA para digitar, não para decidir.

## 1. Leia antes (nesta ordem)
1. [`CLAUDE.md`](../../CLAUDE.md): §0 regras inegociáveis e §5 contrato.
2. [`docs/SPEC-frontend.md`](../SPEC-frontend.md):
   - §5.4 tipos;
   - §6.1 e §6.1.1 (vitais e mapa do corpo);
   - §6.7 matriz de privacidade;
   - **§7 motor de regras**;
   - §17 (ambientes).
3. **[`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md)**, obrigatório em toda tela. A tela de referência é a página 2 do PDF, "Your body, day 120."
4. [`INSTRUCOES-DE-CODIGO.md`](../../INSTRUCOES-DE-CODIGO.md): git, checklist e uso de IA.

## 2. Preparar
```bash
# fora do OneDrive, ex.: C:\dev
git clone https://github.com/Apollo62-spaceapps/astronaut-health-monitor.git
cd astronaut-health-monitor
npm install
npm test        # testes uma vez (modo contínuo: npm run test:watch)
npm run dev
```

## 3. Suas tasks (nesta ordem)

| # | Task | Depende de | Prazo |
|---|---|---|---|
| [#52](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/52) | **L1** · Escrever as regras de sinais vitais, mapa do corpo e privacidade (R-VIT-01/02, R-BODY-01, R-PRIV-01), com testes | K2 (contrato) | dom 01h |
| [#53](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/53) | **L2** · Escrever as regras de radiação, exercício e escalonamento + `engine.ts` (R-RAD-01..03, R-EX-01/02, R-ESC-01), com testes | K2 | dom 01h |
| [#54](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/54) | **L3** · Criar o mapa do corpo clicável com o card de cada zona | K4 (componentes), L1 | dom 01h |
| [#55](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/55) | **L4** · Criar os cards e os gráficos dos sinais vitais (Recharts, baseline pré-voo e em voo) | K3 (dados), K4, L1 | dom manhã |
| [#57](https://github.com/Apollo62-spaceapps/astronaut-health-monitor/issues/57) | **L5** (extra) · Animação, avançar o dia, estado "Adapting" e zona das pernas | L3, L4, F3 | só depois do P0 |

O número da task é a ordem: faça L1 → L2 → L3 → L4, e a L5 só se sobrar tempo.

**Enquanto K2 não entra** (deve sair até ~21h30): comece L1 e L2 usando os tipos da SPEC §5.4 e do adendo §17. Os nomes vão ser os mesmos.

## 4. Seus arquivos
- `src/domain/rules/`: `vitals.ts`, `body.ts`, `privacy.ts`, `radiation.ts`, `exercise.ts`, `escalation.ts`, `engine.ts` e os `*.test.ts`.
- `src/features/overview/` e `src/features/vitals/`.
- **Não edite** `src/domain/types.ts`, `src/state/store.ts` nem `src/domain/config/` sem falar com o Kayque.

## 5. Regras que mais importam no seu trabalho

**Motor de regras**
- **Funções puras:** recebem dados e devolvem resultado. Nada de React, store ou `Date.now()` dentro das regras; passe o tempo como parâmetro.
- **Os limiares vêm de `config/thresholds.ts`.** Decida os valores ilustrativos de P-01 com o Kayque e escreva o motivo no comentário. Os testes checam a lógica, não os valores.
- **R-BODY-01:** a zona recebe o **pior** status dos seus indicadores. A cabeça fica `restricted` para o CMO sem consentimento nem break-glass.
- **R-ESC-01 e R-RAD-02 recebem o ambiente** (Earth / Space Station / Moon / Spacecraft):
  - ETA = 2 × o atraso;
  - a dose diária vem de `doseRateMSvPerDay`; se for `null`, não soma número.
- **Todo `Alert` tem `ruleId`.** Ações só não clínicas: "Re-measure", "Notify CMO", "Follow the onboard medical checklist".

**Telas**
- Use `StatusBadge` e `MetricCard` do Kayque.
- Status com cor + ícone + texto, hachura no Urgent, números em `font-mono tabular-nums`.
- Nada de "fit", "healthy" ou diagnóstico.

## 6. Pronto quando
- `npm test`, `npm run lint` e `npm run build` passam.
- O PR tem `Closes #N`, os IDs da SPEC e o checklist do `INSTRUCOES-DE-CODIGO.md` §7.
- Revisor: o Kayque (PR que mexe em `src/domain/` sempre tem revisão).

Dúvida? Fale com o Kayque no grupo. Travou por mais de 30 min, avise.
