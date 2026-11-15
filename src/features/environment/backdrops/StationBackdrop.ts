// Space Station: rastros de estrelas girando em torno de um polo. Porte de `class Station` de
// docs/reference/backdrops.html, sem mudar cores, contagens nem velocidades.
import { CanvasBackdrop, rnd, TAU } from './backdrop'

/** Parâmetros do arquivo. Se o fps cair no notebook do pitch, reduza STARS. */
const STARS = 460
const OMEGA = 0.035 // rad/s

interface Star {
  r: number
  a: number
  s: number
  o: number
}

export class StationBackdrop extends CanvasBackdrop {
  private px = 0
  private py = 0
  private stars: Star[] = []

  protected init(w: number, h: number) {
    this.px = w * 0.72
    this.py = h * 0.28
    const maxR = Math.hypot(Math.max(this.px, w - this.px), Math.max(this.py, h - this.py))
    this.stars = Array.from({ length: STARS }, () => ({
      r: Math.sqrt(Math.random()) * maxR,
      a: rnd(0, TAU),
      s: rnd(0.5, 1.7),
      o: rnd(0.25, 0.95),
    }))
  }

  protected draw(ctx: CanvasRenderingContext2D, _t: number, dt: number) {
    const { w, h, px, py } = this
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#01060b')
    g.addColorStop(1, '#0b3a4b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.lineCap = 'round'
    for (const s of this.stars) {
      s.a += OMEGA * dt
      const len = 0.05 + s.s * 0.035
      ctx.strokeStyle = `rgba(222,240,248,${s.o})`
      ctx.lineWidth = s.s
      ctx.beginPath()
      ctx.arc(px, py, s.r, s.a - len, s.a)
      ctx.stroke()
    }
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(px, py, 1.8, 0, TAU)
    ctx.fill()
  }

  stop() {
    this.stars = []
    super.stop()
  }
}
