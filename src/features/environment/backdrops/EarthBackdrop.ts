// Earth: céu de entardecer com cúmulos em 2 camadas de paralaxe. Porte de `class Earth` de
// docs/reference/backdrops.html, sem mudar cores, contagens nem velocidades.
import { CanvasBackdrop, rnd, TAU } from './backdrop'

/** Contagens e parâmetros do arquivo. Se o fps cair no notebook do pitch, reduza as camadas aqui. */
const SPRITES = 6
const PUFFS_PER_SPRITE = 16
const SPRITE_W = 380
const SPRITE_H = 190

interface Cloud {
  s: HTMLCanvasElement
  x: number
  y: number
  sc: number
  a: number
  v: number
}

export class EarthBackdrop extends CanvasBackdrop {
  private sprites: HTMLCanvasElement[] = []
  private layers: Cloud[][] = []

  protected init(w: number, h: number) {
    this.sprites = []
    for (let i = 0; i < SPRITES; i++) {
      const c = document.createElement('canvas')
      c.width = SPRITE_W
      c.height = SPRITE_H
      const x = c.getContext('2d')
      if (x) {
        for (let k = 0; k < PUFFS_PER_SPRITE; k++) {
          const px = rnd(70, 310),
            py = rnd(55, 110) - Math.abs(px - 190) * 0.12,
            r = rnd(28, 62)
          const g = x.createRadialGradient(px, py, 0, px, py, r)
          g.addColorStop(0, 'rgba(236,242,255,.62)')
          g.addColorStop(1, 'rgba(236,242,255,0)')
          x.fillStyle = g
          x.beginPath()
          x.arc(px, py, r, 0, TAU)
          x.fill()
        }
        x.globalCompositeOperation = 'destination-in'
        const m = x.createLinearGradient(0, 40, 0, 150)
        m.addColorStop(0, '#fff')
        m.addColorStop(0.7, '#fff')
        m.addColorStop(1, 'rgba(255,255,255,0)')
        x.fillStyle = m
        x.fillRect(0, 0, SPRITE_W, SPRITE_H)
      }
      this.sprites.push(c)
    }
    const mk = (n: number, scale: number, alpha: number, speed: number, ymax: number): Cloud[] =>
      Array.from({ length: n }, () => ({
        s: this.sprites[(Math.random() * SPRITES) | 0]!,
        x: rnd(-200, w),
        y: rnd(0, h * ymax),
        sc: scale * rnd(0.8, 1.25),
        a: alpha * rnd(0.7, 1),
        v: speed * rnd(0.8, 1.2),
      }))
    this.layers = [mk(8, 0.7, 0.5, 6, 0.55), mk(6, 1.25, 0.75, 15, 0.7)]
  }

  protected draw(ctx: CanvasRenderingContext2D, _t: number, dt: number) {
    const { w, h } = this
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#061742')
    g.addColorStop(0.55, '#17448f')
    g.addColorStop(1, '#8aa6d8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    const sun = ctx.createRadialGradient(w * 0.9, h * 0.95, 0, w * 0.9, h * 0.95, w * 0.55)
    sun.addColorStop(0, 'rgba(235,242,255,.55)')
    sun.addColorStop(1, 'rgba(235,242,255,0)')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, w, h)
    for (const L of this.layers)
      for (const c of L) {
        c.x += c.v * dt
        if (c.x > w + 40) {
          c.x = -SPRITE_W * c.sc
          c.y = rnd(0, h * 0.65)
        }
        ctx.globalAlpha = c.a
        ctx.drawImage(c.s, c.x, c.y, SPRITE_W * c.sc, SPRITE_H * c.sc)
      }
    ctx.globalAlpha = 1
  }

  stop() {
    for (const s of this.sprites) s.width = s.height = 0
    this.sprites = []
    this.layers = []
    super.stop()
  }
}
