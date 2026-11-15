// Spacecraft: rastros lentos violeta/branco, sensação de velocidade. Porte de `class Craft` de
// docs/reference/backdrops.html, sem mudar cores, contagens nem velocidades.
import { CanvasBackdrop, rnd, TAU } from './backdrop'

/** Parâmetros do arquivo. Se o fps cair no notebook do pitch, reduza PARTICLES. */
const PARTICLES = 430
const COLORS = ['#e6dcff', '#b9a6ff', '#8f78ff', '#ffffff', '#cfc2ff'] as const

interface Particle {
  a: number
  z: number
  c: string
  k: number
}

export class SpacecraftBackdrop extends CanvasBackdrop {
  private first = true
  private p: Particle[] = []
  /** Os rastros somem 30% por quadro: depois de 20 quadros o resto do início é < 0,1%. */
  protected warmupSteps = 20

  protected init() {
    this.first = true
    this.p = Array.from({ length: PARTICLES }, () => this.spawn(true))
  }

  private spawn(any: boolean): Particle {
    return {
      a: rnd(0, TAU),
      z: any ? rnd(0.04, 1) : 1,
      c: COLORS[(Math.random() * COLORS.length) | 0]!,
      k: rnd(0.7, 1.3),
    }
  }

  protected draw(ctx: CanvasRenderingContext2D, _t: number, dt: number) {
    const { w, h } = this,
      cx = w / 2,
      cy = h * 0.46
    if (this.first) {
      ctx.fillStyle = '#05030f'
      ctx.fillRect(0, 0, w, h)
      this.first = false
    }
    // Rastro: cobre o quadro anterior com 30% do fundo.
    ctx.fillStyle = 'rgba(5,3,15,.30)'
    ctx.fillRect(0, 0, w, h)
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5)
    core.addColorStop(0, 'rgba(110,80,230,.20)')
    core.addColorStop(1, 'rgba(110,80,230,0)')
    ctx.fillStyle = core
    ctx.fillRect(0, 0, w, h)
    ctx.lineCap = 'round'
    for (let i = 0; i < this.p.length; i++) {
      const q = this.p[i]!,
        pz = q.z
      q.z -= dt * 0.14 * q.k * (1 + (1 - q.z) * 1.2)
      if (q.z < 0.02) {
        this.p[i] = this.spawn(false)
        continue
      }
      const r1 = 26 / q.z,
        r0 = 26 / pz,
        ca = Math.cos(q.a),
        sa = Math.sin(q.a)
      ctx.strokeStyle = q.c
      ctx.globalAlpha = Math.min(1, 0.25 + (1 - q.z) * 1.1)
      ctx.lineWidth = 0.7 + (1 - q.z) * 2
      ctx.beginPath()
      ctx.moveTo(cx + ca * r0, cy + sa * r0)
      ctx.lineTo(cx + ca * r1, cy + sa * r1)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  stop() {
    this.p = []
    super.stop()
  }
}
