# Apollo 62 · Design System v2

> **Leia antes de escrever qualquer tela.** Em conflito com a SPEC (NFR-07), **vale este design system**. Contrastes conferidos com a fórmula WCAG em 15/11/2026.
>
> **v2 (15/11/2026):** evolução do v1 ("NASA style", `docs/design/`). Mantém as regras de status, proveniência, números em mono e vermelho só para ação. Muda tipografia, superfícies, raios, selos e gráficos para tirar a "cara de IA" e deixar a leitura mais clínica.

**Direção:** sóbrio, funcional e legível de relance, como uma interface de cabine (referência: telas da Crew Dragon) com superfícies e cantos no estilo iOS. Escuro, alto contraste, pouca cor: **a cor só aparece onde há algo a sinalizar.**

---

## 1. Cores (tokens em `src/index.css`)

### Superfícies e marca

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `--color-ground` | `#000000` | Fundo da página e header | — |
| `--color-surface` | `#1C1C1E` | Cards e painéis | branco 17,0:1 |
| `--color-surface-2` | `#2C2C2E` | Superfície interna: linhas agrupadas, inputs, trilho de barras | branco 13,9:1 |
| `--color-border` | `#38383A` | Separadores finos (só quando precisa separar) | — |
| `--color-banner` | por ambiente (§7) | Faixa da missão | branco ≥ 9,7:1 |
| `--color-action` | `#A52420` | **Só o botão primário** | branco 7,3:1 |
| `--color-action-hover` | `#920107` | Hover do primário | branco 9,4:1 |
| `--color-link` | `#6FA8FF` | Links e foco | sobre surface 7,1:1 |
| `--color-muted` | `#A9AFB5` | Texto secundário, rótulos, Restricted, Adapting | sobre surface 7,7:1 |

### Status (sempre cor + ícone + texto)

| Token | Hex | Ícone | Texto | Sobre surface |
|---|---|---|---|---|
| `--color-normal` | `#3DDC97` | ✓ | Normal | 9,6:1 |
| `--color-attention` | `#F5B83D` | ▲ | Attention | 9,6:1 |
| `--color-urgent` | `#FF6B63` | ● | Urgent (+ hachura) | 6,1:1 |
| `--color-muted` | `#A9AFB5` | ◼ | Restricted | 7,7:1 |
| `--color-muted` | `#A9AFB5` | ↻ | Adapting | 7,7:1 |

**Regras de cor**
- O vermelho da marca nunca sinaliza status. Urgent usa `#FF6B63`.
- Status nunca só por cor. Urgent leva hachura; no mapa do corpo, todo status não normal leva hachura (BODY-04).
- **Cinza é o padrão.** Uma tela normal é quase toda branca e cinza. Se uma cor aparece, ela significa algo.
- Proibido: gradientes, brilho (glow), sombras decorativas, roxo/índigo como cor de interface.

---

## 2. Tipografia

- **Família:** IBM Plex Sans (`@fontsource-variable/ibm-plex-sans`) e IBM Plex Mono (`@fontsource/ibm-plex-mono`, 400 e 500). Nada via CDN.
- **Mono só em números** (`num` = mono + algarismos tabulares): `84`, `216.0 mSv`, `00 HRS 40 MINS`. Texto de status, rótulos e frases ficam em Plex Sans.
- **Títulos:** peso 600, tracking leve (−0,01em). Tamanho de página: `text-3xl`. Nada de título gigante em peso 800.
- **Corpo:** 16 px, regular. Texto secundário: `text-muted`.
- **Rótulos pequenos em caixa alta** são permitidos (`RESTING HEART RATE`, `MISSION DAY 120 · SIMULATED`), com `tracking-wider` e 11–12 px. O resto em sentence case.

---

## 3. Forma: superfícies e cantos (estilo iOS)

- **Cards sem borda e sem sombra.** A separação vem da diferença de cinza (`ground` → `surface` → `surface-2`).
- **Raios:** card `16px` (`rounded-lg`), controles e linhas agrupadas `10px` (`rounded-md`), elementos pequenos `6px` (`rounded-sm`), painéis grandes `24px` (`rounded-xl`).
- **Concêntricos:** elemento dentro de outro usa **raio interno = raio externo − padding**. Card 16 px com padding 8 px → filho 8 px. Nunca o mesmo raio dentro e fora.
- **Canto contínuo (squircle):** aplicado automaticamente via `@supports (corner-shape: squircle)` em `index.css`. Funciona no Chrome/Edge 139+; nos outros navegadores cai para o arredondado comum. **Use Chrome no notebook do pitch.**
- **Listas agrupadas** (estilo Ajustes do iOS): linhas em `surface-2` dentro do card, separadas por linha fina `border` recuada, em vez de vários cards empilhados.

---

## 4. Componentes

| Componente | Como é |
|---|---|
| **StatusBadge** | **Sem caixa.** Ícone + texto na cor do status, detalhe em mono cinza: `▲ Attention · +18% vs pre-flight`. Urgent leva hachura de fundo com `rounded-sm px-1` |
| **ProvenanceBadge** | **Sem fundo.** Texto 11 px em caixa alta: `SIMULATED` em cinza; `REAL · DONKI` em azul de link. Clicável → Data & Sources |
| **Botão primário** | Fundo `action`. **Um por tela** |
| **Botão secundário** | Contorno ou fundo `surface-2`; nunca vermelho |
| **Metric card** | Rótulo pequeno em caixa alta, número grande em mono, status sem caixa, legenda em `muted`, proveniência no fim |
| **Faixa da missão** | Fundo `banner` (§7) |
| **Rodapé fixo** | "Decision-support prototype — not a medical device, not for diagnosis. Some data simulated." |

---

## 5. Movimento

- **Funcional:** anima só mudança de estado (alerta aparece, zona muda de status, número atualiza). 150–250 ms, `ease-out`.
- Nada de animação de entrada decorativa, nada de pulso contínuo. Pulso só em Urgent, ≤ 1,5 Hz (BODY-05).
- Sempre respeitar `prefers-reduced-motion` (já está no `index.css`).

---

## 6. Gráficos (CORE-05 v2)

O gráfico responde a **uma pergunta: "estou dentro do meu normal?"**. Tudo que não ajuda a responder isso sai.

### Regras
1. **Uma referência só:** faixa cinza (`#fff` a 7%) = baseline pré-voo ± limiar de atenção. Rótulo direto "Your normal range". Os limiares são ilustrativos até P-01, e o rodapé do gráfico diz isso.
2. **Linha = média móvel de 7 dias**, branca, 1,75 px. Sem pontos diários na tela; eles ficam no tooltip.
3. **Valor de hoje = ponto** com a cor do status e rótulo direto em mono (`84 today`). É o único elemento colorido do gráfico.
4. **Eixos com 3 marcas** (mín., meio, máx.). Eixo X em dias de missão (`D0 · D60 · D120`). Unidade no card, não no eixo.
5. **Sem legenda.** Rótulo direto na linha ou na faixa; rodapé de uma linha explica "Line: 7-day average · Range: …".
6. **Anotação só se afeta a métrica.** Ex.: troca de gravidade no gráfico de pressão (BODY-09). Nunca marcar o evento solar num gráfico cardíaco (sugere causa sem fonte).
7. **Média em voo** aparece como texto no card (`In-flight 74 bpm`), não como segunda linha.
8. **Título/legenda dizem a conclusão** quando houver espaço ("Above your baseline since day 114").
9. **Alternativa acessível:** `aria-label` no `<figure>` e tooltip com os valores.

### Um tipo de gráfico por pergunta

| Tela | Pergunta | Gráfico |
|---|---|---|
| Overview | "Algum indicador saiu do normal?" | Sparkline 30 dias: faixa cinza, linha, ponto de hoje colorido. Sem eixos |
| Vitals | "Desde quando e quanto?" | Linha (regras acima), um por vital, mesmo eixo X |
| Radiation | "Quanto do meu limite já usei?" | Régua 0–600 mSv: preenchimento branco, limite marcado em `urgent` com rótulo. **Nada de rosca/anel** |
| Exercise | "Cumpri o plano da semana?" | 7 colunas (minutos feitos) com marca do prescrito em cada dia |
| Wellbeing | "Como andaram humor e sono?" | 14 pontos ligados por linha (poucos pontos: marcador permitido), eixo 1–5 com palavras nas pontas |

### Fundamentos (para defender no pitch)
- Referência pessoal no lugar da faixa populacional melhora a compreensão (Scherer et al., JMIR 2018, doi:10.2196/11027).
- Exibição visual em vez de tabela aumenta a sensibilidade a variações (Zikmund-Fisher et al., JAMIA 2017;24(3):520–528, doi:10.1093/jamia/ocw169).
- Sparkline com faixa normal cinza e último valor destacado (Tufte, *Beautiful Evidence*, p. 46–63).
- Evitar marcadores em linhas com muitos pontos; anotar só eventos significativos (ONS Service Manual, Line charts).

---

## 7. Ambientes (faixa da missão)

O botão de modo troca o comportamento da plataforma. Visualmente, **só a faixa da missão e o ícone mudam**.

| Ambiente | `data-environment` | Cor da faixa | Contraste com branco | Ícone (lucide) |
|---|---|---|---|---|
| Earth | `earth` | `#093174` | 12,3:1 | `Globe` |
| Space Station | `station` | `#0B4A5E` | 9,7:1 | `Satellite` |
| Moon | `moon` | `#3A3F45` | 10,6:1 | `Moon` |
| Spacecraft | `spacecraft` | `#2E1F66` *(PENDENTE: avaliar troca do roxo)* | 14,0:1 | `Rocket` |

---

## 8. Anti-"cara de IA" (proibido)

- Inter, Roboto ou fonte de sistema como fonte principal.
- Gradiente roxo/índigo, texto com gradiente, brilho, glassmorphism.
- Selo com borda para tudo; dois selos por métrica.
- Mesmo raio dentro e fora; `rounded-2xl shadow-lg` como padrão de card.
- Três cards iguais com ícone em fila como layout padrão.
- Título hero gigante em peso 800 numa tela de dados.
- Gráfico com legenda, grade densa, pontos em todos os dias ou dois baselines sobrepostos.
- Emoji na interface.

---

## 9. Faça e não faça

| Faça | Não faça |
|---|---|
| Uma ação primária vermelha por tela | Vermelho de marca para status |
| Números em mono tabular; texto em Plex Sans | Mono em frases e rótulos |
| Status com ícone + texto, sem caixa | Status só por cor; status dentro de pílula com borda |
| Selo REAL/SIMULATED em todo número | Número sem proveniência |
| Cor só onde há sinal | Cor decorativa |
| Raios concêntricos | Mesmo raio em tudo |
| Foco visível, contraste AA ou mais | Animação > 1,5 Hz; ignorar `prefers-reduced-motion` |
| Layout ≥ 1280 px | Gastar tempo com responsivo (P2) |
