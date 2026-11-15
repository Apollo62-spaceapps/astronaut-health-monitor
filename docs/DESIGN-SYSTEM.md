# Apollo 62 · Design System (NASA style)

> **Leia antes de escrever qualquer tela.** Fonte: [`docs/design/Apollo 62 · Design System (NASA style).pdf`](design/). Este arquivo transcreve o PDF e acrescenta as regras de uso. Em conflito com a SPEC (NFR-07), **vale este design system**. Os contrastes foram conferidos com a fórmula WCAG em 14/11/2026.

**Estilo:** inspirado no nasa.gov. Escuro, alto contraste, **vermelho só para ação**.

---

## 1. Cores (tokens)

### Marca e superfícies

| Token (Tailwind v4) | Hex | Uso | Contraste |
|---|---|---|---|
| `--color-ground` | `#000000` | Header e fundo da página | — |
| `--color-surface` | `#181A1B` | Cards e painéis | branco sobre ele: 17,5:1 |
| `--color-banner` | `#093174` | Faixa da missão (banner) | branco: 12,3:1 |
| `--color-action` | `#A52420` | **Só o botão primário** | branco: 7,3:1 |
| `--color-action-hover` | `#920107` | Hover e pressionado do botão primário | branco: 9,4:1 |
| `--color-link` | `#6FA8FF` | Links (o azul da marca é escuro demais para texto) | sobre surface: 7,3:1 |
| `--color-muted` | `#A9AFB5` | Texto secundário e status Restricted | sobre surface: 7,9:1 |

### Status (sempre cor + ícone + texto)

| Token | Hex | Ícone | Texto na UI | Contraste sobre surface |
|---|---|---|---|---|
| `--color-normal` | `#3DDC97` | ✓ | Normal | 9,9:1 |
| `--color-attention` | `#F5B83D` | ▲ | Attention | 9,8:1 |
| `--color-urgent` | `#FF6B63` | ● | Urgent (+ **hachura**) | 6,3:1 |
| `--color-muted` | `#A9AFB5` | ◼ | Restricted | 7,9:1 |
| `--color-muted` | `#A9AFB5` | ↻ | Adapting *(o PDF não define; DECISÃO: cor neutra + ícone próprio)* | 7,9:1 |

**Regras de cor**
- **O vermelho da marca (`#A52420`) nunca sinaliza status.** O status Urgent usa `#FF6B63`.
- O status **nunca** é só cor: sempre ícone + texto. **Urgent leva hachura** (no mapa do corpo, hachura em todo status que não é Normal, BODY-04).
- O status nunca muda de cor por ambiente (§5).

### Tokens Tailwind v4 (`src/index.css`)

```css
@import "tailwindcss";

@theme {
  --color-ground: #000000;
  --color-surface: #181a1b;
  --color-banner: #093174;
  --color-action: #a52420;
  --color-action-hover: #920107;
  --color-link: #6fa8ff;
  --color-muted: #a9afb5;
  --color-normal: #3ddc97;
  --color-attention: #f5b83d;
  --color-urgent: #ff6b63;

  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

Com isso, as classes `bg-surface`, `text-normal`, `bg-action`, `hover:bg-action-hover`, `text-link`, `font-mono` etc. passam a existir. Os componentes shadcn devem ter as variáveis apontando para estes tokens.

---

## 2. Tipografia

- **Família:** Inter (`@fontsource-variable/inter`) e uma fonte mono (`@fontsource/jetbrains-mono`). Nada via CDN.
- **Corpo:** 16–18 px, peso regular.
- **Títulos:** peso **800**, tracking apertado.
- **Números: sempre mono com algarismos tabulares** (`font-mono tabular-nums`). Exemplos: `216.0 mSv`, `72 bpm`.
- **Caixa:** use sentence case. Nada em CAIXA ALTA, exceto rótulos pequenos (ex.: `HEART RATE · REST`, `MISSION DAY 120 · SIMULATED`).

---

## 3. Componentes

| Componente | Como é |
|---|---|
| **Botão primário** | Fundo `action`, texto branco, hover `action-hover`. **Só uma ação primária por tela** (ex.: "Log measurement") |
| **Botão secundário** | Contorno ou fundo neutro; nunca vermelho |
| **StatusBadge** | `✓ Normal` · `▲ Attention` · `● Urgent` · `◼ Restricted` (· `↻ Adapting`). Cor do status + ícone + texto |
| **ProvenanceBadge** | `REAL · DONKI` (indica a fonte) e `SIMULATED`. Clicável leva à fonte (SRC-02) |
| **Metric card** | Rótulo em caixa alta pequena (ex.: `HEART RATE · REST`), número grande em mono (`84 bpm`), linha de status (`▲ Attention · +18%`) e selo de proveniência |
| **Faixa da missão (banner)** | Fundo `banner`. Mostra o ambiente, o perfil, o modo de IA e a janela de resposta do solo |
| **Contagem da janela de resposta** | "Ground reply window · ‹ambiente›" com `HRS MINS SECS` em mono |
| **Rodapé fixo** | "Decision-support prototype — not a medical device, not for diagnosis. Some data simulated." |

---

## 4. Tela de referência (Overview, página 2 do PDF)

```
┌ header (ground #000) ── APOLLO 62 ─────────────────────── Explore ⌄ · Search ┐
│ banner (#093174): Mission: Mars transit ⌄ · Role: Astronaut ⌄ · AI: protocol mode │
│ Ground reply window · Mars transit   00 HRS  40 MINS  00 SECS                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ MISSION DAY 120 · SIMULATED                                                  │
│ Your body, day 120.                                  (título 800)            │
│ Resting heart rate is 18% above your own baseline. Re-measure,               │
│ then notify the CMO. Ground reply would take about 40 minutes.               │
│ [ Log measurement ]  ← único botão vermelho                                  │
│                                                                              │
│  mapa do corpo:  ▲ Heart   ◼ Head · Restricted   ✓ Legs                      │
│                                                                              │
│ HEART RATE · REST   BLOOD PRESSURE   CAREER DOSE        EXERCISE ADHERENCE   │
│ 84 bpm              121/79           36%                86%                  │
│ ▲ Attention · +18%  ✓ Normal · +2%   of 600 mSv         ✓ 6-day streak       │
│ SIMULATED           SIMULATED        SIMULATED          SIMULATED            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Decision-support prototype — not a medical device, not for diagnosis. …     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Com o adendo §17, na barra:**
- "Mission: Mars transit ⌄" vira o **seletor de ambiente** (Earth · Space Station · Moon · Spacecraft).
- O texto da janela de resposta segue o ambiente, por exemplo "Ground reply window · Spacecraft".
- "36% of 600 mSv" corresponde a 216 mSv (120 dias × 1,8). A dose prévia dos fixtures soma a isso.

---

## 5. Ambientes (adendo §17) dentro do design system

O seletor funciona como o botão de modo noturno. **Só a faixa da missão (banner) e o ícone do ambiente mudam.** Status, botão de ação e superfícies continuam iguais.

| Ambiente | `data-environment` | Cor da faixa | Contraste com branco | Ícone (lucide) |
|---|---|---|---|---|
| Earth | `earth` | `#093174` (banner do PDF) | 12,3:1 | `Globe` |
| Space Station | `station` | `#0B4A5E` *(DECISÃO)* | 9,7:1 | `Satellite` |
| Moon | `moon` | `#3A3F45` *(DECISÃO)* | 10,6:1 | `Moon` |
| Spacecraft | `spacecraft` | `#2E1F66` *(DECISÃO)* | 14,0:1 | `Rocket` |

```css
[data-environment="station"]    { --color-banner: #0b4a5e; }
[data-environment="moon"]       { --color-banner: #3a3f45; }
[data-environment="spacecraft"] { --color-banner: #2e1f66; }
```

**Spacecraft × Space Station:**
- **Spacecraft** é a nave menor, em trânsito.
- **Space Station** é a estação maior, onde a nave atraca.

Na Space Station, a rotina pode incluir a manutenção da Spacecraft (tarefa simulada; SPEC §18).

---

## 6. Faça e não faça

| Faça | Não faça |
|---|---|
| Uma ação primária vermelha por tela | Usar vermelho de marca para status ou alerta |
| Números em mono tabular | Números em fonte proporcional (desalinham) |
| Status com ícone + texto (+ hachura no Urgent) | Status só por cor |
| Selo REAL ou SIMULATED em todo número | Número sem proveniência |
| Sentence case | Títulos em CAIXA ALTA |
| Foco visível, navegação por teclado, contraste AA ou mais | Animação acima de ~1,5 Hz; ignorar `prefers-reduced-motion` |
| Layout para ≥ 1280 px | Gastar tempo com responsivo (é P2) |
