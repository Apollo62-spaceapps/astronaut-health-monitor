// Base dos fundos animados por ambiente (L6). Decoração pura: não lê nem escreve dado de saúde.
// Cada ambiente porta uma classe de docs/reference/backdrops.html (aprovado pelo Lucas em 15/11) sem
// mudar a lógica visual. Como no arquivo, desenha em pixels do dispositivo (canvas = CSS × DPR, sem
// ctx.scale), então espessuras, raios e tamanhos ficam iguais aos da simulação.

export const rnd = (a: number, b: number) => a + Math.random() * (b - a)
export const TAU = Math.PI * 2

/**
 * Passos de aquecimento ao montar ou redimensionar; também dão o quadro estático do reduced-motion.
 * O arquivo roda 90 em todos, mas eles rodam de uma vez na troca de modo (na Moon, 1–2 s de tela travada).
 * Só a Spacecraft precisa deles (os rastros se acumulam); nos outros, 1 quadro dá a mesma imagem.
 */
export const WARMUP_STEPS = 1

/**
 * Resolução interna do bitmap em relação ao desenho (0,5 = metade em cada eixo, ~1/4 dos pixels).
 * A geometria é a mesma (ctx.scale); o navegador amplia o canvas, e as linhas ficam um pouco mais suaves.
 * O fundo desenha na thread principal: em resolução cheia ele deixava o app lento num Intel HD 620.
 */
export const RENDER_SCALE = 0.5

export interface Backdrop {
  /** Pega o contexto 2D. false = sem canvas (o chamador cai no gradiente CSS). */
  start(canvas: HTMLCanvasElement): boolean
  /** Tamanho em px CSS e DPR (já limitado). Recria o estado e roda o aquecimento, como o build() do arquivo. */
  resize(w: number, h: number, dpr: number): void
  /** Um quadro. t em segundos; dt em segundos, já limitado pelo chamador (≤ 0,05). */
  frame(t: number, dt: number): void
  /** Solta o estado e o bitmap do canvas. */
  stop(): void
}

export abstract class CanvasBackdrop implements Backdrop {
  protected ctx: CanvasRenderingContext2D | null = null
  private canvas: HTMLCanvasElement | null = null
  /** Largura e altura em pixels do dispositivo (o `w`/`h` das classes do arquivo). */
  protected w = 0
  protected h = 0
  protected warmupSteps = WARMUP_STEPS

  /** Equivale ao constructor(w, h) do arquivo. */
  protected abstract init(w: number, h: number): void
  /** Equivale ao frame(ctx, t, dt) do arquivo. */
  protected abstract draw(ctx: CanvasRenderingContext2D, t: number, dt: number): void

  start(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    return this.ctx !== null
  }

  resize(cssW: number, cssH: number, dpr: number) {
    const { canvas, ctx } = this
    if (!canvas || !ctx) return
    this.w = Math.max(1, Math.round(cssW * dpr))
    this.h = Math.max(1, Math.round(cssH * dpr))
    canvas.width = Math.max(1, Math.round(this.w * RENDER_SCALE))
    canvas.height = Math.max(1, Math.round(this.h * RENDER_SCALE))
    // Mudar o tamanho zera o estado do contexto; a escala vem depois.
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0)
    this.init(this.w, this.h)
    for (let i = 0; i < this.warmupSteps; i++) this.draw(ctx, i / 30, 1 / 30)
  }

  frame(t: number, dt: number) {
    if (this.ctx) this.draw(this.ctx, t, dt)
  }

  stop() {
    if (this.canvas) {
      // Zerar o tamanho libera o bitmap do canvas.
      this.canvas.width = 0
      this.canvas.height = 0
    }
    this.canvas = null
    this.ctx = null
  }
}
