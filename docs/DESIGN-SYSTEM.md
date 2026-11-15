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
- Proibido: gradientes, brilho (glow), sombras decorativas, roxo/índigo como cor de interface. **Exceção provisória:** a faixa da Spacecraft (`#2E1F66`, §7), fixada no `CLAUDE.md` §5.1, até o time decidir se troca a cor.
- **Exceção (L6, 15/11, aprovada pelo Lucas):** o fundo decorativo por ambiente (§7.1) usa gradientes e, na Spacecraft, violeta. Ele fica atrás de tudo, não carrega informação e nunca usa verde, âmbar ou vermelho. Cards, tabelas e gráficos continuam opacos. O texto que fica direto sobre o fundo leva um halo escuro (`.on-backdrop`, funcional, não decorativo).

---

## 2. Tipografia

- **Família:** IBM Plex Sans (`@fontsource-variable/ibm-plex-sans`) e IBM Plex Mono (`@fontsource/ibm-plex-mono`, 400, 500 e 600). Nada via CDN. O 600 existe porque há números em peso 600 (cards, contagem da faixa, números dentro de títulos); sem ele o navegador cria um negrito falso.
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
- **Exceção (decisão do time, commit `e4ee320`):** no mapa do corpo, o batimento ilustrativo do coração (ciclo de 1,2 s) e a respiração do tronco (ciclo de 5 s) ficam ligados, com o aviso "Illustrative rhythm, not a live reading". Eles não substituem o status (ícone, texto e hachura continuam) e param com `prefers-reduced-motion`.
- **Exceção (L6):** o fundo decorativo por ambiente se move devagar (§7.1). Não pisca e não muda a luminância de forma brusca (WCAG 2.3.1), e fica estático com `prefers-reduced-motion`.
- Sempre respeitar `prefers-reduced-motion` (já está no `index.css`).

---

## 6. Gráficos (CORE-05 v2)

O gráfico responde a **uma pergunta: "estou dentro do meu normal?"**. Tudo que não ajuda a responder isso sai.

### Regras
1. **Uma referência só:** faixa cinza (`foreground` a 7%) com bordas tracejadas finas em `muted` = baseline pré-voo ± limiar de atenção (a mesma conta da regra R-VIT-02: o ponto de hoje fica fora da faixa só quando o status não é Normal). O preenchimento sozinho tem 1,22:1 com o fundo; as bordas garantem ≥ 3:1 (WCAG 1.4.11). Rótulo direto "Your normal range". Os limiares são ilustrativos até P-01, e o rodapé do gráfico diz isso.
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
| Radiation | "Quanto do meu limite já usei?" | Régua 0–600 mSv: preenchimento branco, limite marcado em cinza com rótulo. A cor de status só entra quando houver regra com nível para a dose (R-RAD-04, P1). **Nada de rosca/anel** |
| Exercise | "Cumpri o plano da semana?" | 7 colunas (minutos feitos) com marca do prescrito em cada dia. Substitui o "anel de progresso semanal" da EX-04 (P1) |
| Wellbeing | "Como andaram humor e sono?" | 14 pontos ligados por linha (poucos pontos: marcador permitido), eixo 1–5 com palavras nas pontas |

### Fundamentos (para defender no pitch)

Referências de design, não de saúde: não sustentam nenhuma afirmação na interface, por isso ficam fora do catálogo S01–S19 (`src/data/sources.ts`). Conferidas em 15/11/2026; a coluna "Status" diz o que ainda falta.

| Ideia | Referência | Status |
|---|---|---|
| Substituir a faixa de referência, em vez de somar outra, melhora a compreensão do resultado | Scherer et al., "Improving the Understanding of Test Results by Substituting (Not Adding) Goal Ranges", *J Med Internet Res* 2018;20(10):e11027, doi:10.2196/11027 | Título e DOI conferidos (Crossref); ler o artigo antes de citar números |
| Gráficos ajudam pacientes a distinguir desvios urgentes de não urgentes em exames | Zikmund-Fisher et al., "Graphics help patients distinguish between urgent and non-urgent deviations in laboratory test results", *JAMIA* 2017;24(3):520–528, doi:10.1093/jamia/ocw169 | Título e DOI conferidos (Crossref); ler o artigo antes de citar números |
| Sparkline com faixa normal cinza e último valor destacado | Tufte, *Beautiful Evidence* (2006), capítulo sobre sparklines, p. 46–63 | Verificar as páginas |
| Evitar marcadores em linhas com muitos pontos; anotar só eventos significativos | ONS Service Manual, Line charts — https://service-manual.ons.gov.uk/data-visualisation/chart-types/line-chart | Página conferida |

---

## 7. Ambientes (faixa da missão)

O botão de modo troca o comportamento da plataforma. Visualmente, mudam **a faixa da missão, o ícone e o fundo decorativo** (§7.1).

| Ambiente | `data-environment` | Cor da faixa | Contraste com branco | Ícone (lucide) |
|---|---|---|---|---|
| Earth | `earth` | `#093174` | 12,3:1 | `Globe` |
| Space Station | `station` | `#0B4A5E` | 9,7:1 | `Satellite` |
| Moon | `moon` | `#3A3F45` | 10,6:1 | `Moon` |
| Spacecraft | `spacecraft` | `#2E1F66` *(exceção à regra do roxo, §1; PENDENTE: decidir se troca)* | 14,0:1 | `Rocket` |

### 7.1 Fundo decorativo por ambiente (L6)

Fonte: `docs/reference/backdrops.html` (aprovado pelo Lucas em 15/11), portado para `src/features/environment/backdrops/`. Canvas 2D, sem WebGL, sem imagem, sem lib nova.

| Ambiente | Fundo |
|---|---|
| Earth | Céu de entardecer com nuvens em 2 camadas de paralaxe |
| Space Station | Rastros de estrelas girando em torno de um polo |
| Moon | Terreno em wireframe cinza com a Terra no horizonte |
| Spacecraft | Rastros violeta/brancos, sensação de velocidade |

- Opacidade `--backdrop-opacity: 0.6` (index.css) mais a vinheta.
- Troca com crossfade de 500 ms; fora dele, uma animação por vez.
- `prefers-reduced-motion`: um quadro estático. Aba oculta: o loop para. Sem canvas: gradiente CSS do ambiente.

---

## 8. Anti-"cara de IA" (proibido)

- Inter, Roboto ou fonte de sistema como fonte principal.
- Gradiente roxo/índigo, texto com gradiente, brilho, glassmorphism.
- Selo com borda para tudo; dois selos para o **mesmo** número. A regra é um selo por número: se um card junta um valor simulado e um limite real (ex.: Career dose, SIMULATED + REAL · NASA OCHMO), cada um leva o seu (NFR-05).
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
