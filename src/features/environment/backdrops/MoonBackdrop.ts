// Moon: sobrevoo de terreno em wireframe cinza, com a Terra no horizonte. Porte de `class Moon` de
// docs/reference/backdrops.html, sem mudar cores, contagens nem velocidades.
import { CanvasBackdrop, rnd, TAU } from './backdrop'

/** Parâmetros do arquivo. Se o fps cair no notebook do pitch, reduza ROWS (ou aumente X_STEP). */
const STARS = 140
const ROWS = 38
const Z_NEAR = 1.2
const DZ = 0.45
const X_STEP = 0.6
const SPEED = 0.55
const GROUND = '#06090c'
/** Maior queda de uma linha abaixo do horizonte, em unidades do arquivo: 1,15 − altura mínima (−1,1). */
const MAX_DROP = 2.25

interface Star {
  x: number
  y: number
  o: number
  r: number
}

export class MoonBackdrop extends CanvasBackdrop {
  private s = 0
  private stars: Star[] = []

  protected init(w: number, h: number) {
    this.s = 0
    this.stars = Array.from({ length: STARS }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.55,
      o: rnd(0.2, 0.8),
      r: rnd(0.4, 1.1),
    }))
  }

  private height(x: number, z: number) {
    return 0.55 * (Math.sin(x * 0.8 + z * 0.5) + 0.6 * Math.sin(x * 1.9 - z * 0.9) + 0.4 * Math.sin(x * 0.3 + z * 1.7))
  }

  protected draw(ctx: CanvasRenderingContext2D, _t: number, dt: number) {
    const { w, h } = this
    this.s += dt * SPEED
    const hor = h * 0.56
    ctx.fillStyle = '#04070a'
    ctx.fillRect(0, 0, w, h)
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.o})`
      ctx.fillRect(s.x, s.y, s.r, s.r)
    }
    // Terra no horizonte (fixa)
    const ex = w * 0.78,
      ey = h * 0.2,
      er = Math.min(w, h) * 0.055
    const glow = ctx.createRadialGradient(ex, ey, er * 0.8, ex, ey, er * 3)
    glow.addColorStop(0, 'rgba(90,150,255,.35)')
    glow.addColorStop(1, 'rgba(90,150,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(ex, ey, er * 3, 0, TAU)
    ctx.fill()
    const eg = ctx.createRadialGradient(ex - er * 0.35, ey - er * 0.35, er * 0.1, ex, ey, er)
    eg.addColorStop(0, '#5f97e6')
    eg.addColorStop(1, '#0d2e66')
    ctx.fillStyle = eg
    ctx.beginPath()
    ctx.arc(ex, ey, er, 0, TAU)
    ctx.fill()
    // Fileiras do terreno, do fundo para a frente.
    // Desempenho (L6, medido num Intel HD 620: 18 fps com o original): no arquivo, cada fileira preenche
    // até o pé da tela só para esconder as fileiras de trás (39 preenchimentos de ~40% da tela por quadro).
    // Aqui o chão abaixo do horizonte é pintado uma vez com a mesma cor, e cada fileira preenche só até
    // onde uma fileira de trás pode chegar: (1,15 − altura mín.) × 0,5h / d ≤ 2,25 × 0,5h / (d + DZ).
    // A imagem é a mesma (as linhas de trás continuam escondidas pelas da frente).
    ctx.fillStyle = GROUND
    ctx.fillRect(0, hor, w, h - hor)
    const base = Math.floor(this.s),
      frac = this.s - base
    for (let k = ROWS; k >= 0; k--) {
      const d = Z_NEAR + (k - frac) * DZ,
        wz = (base + k) * DZ
      const pts: [number, number][] = []
      for (let x = -10; x <= 10; x += X_STEP) {
        pts.push([w / 2 + (x * (w * 0.55)) / d, hor + ((1.15 - this.height(x, wz)) * (h * 0.5)) / d])
      }
      const [first, ...rest] = pts
      if (!first) continue
      const occludeTo = Math.min(h + 50, hor + (MAX_DROP * (h * 0.5)) / (d + DZ) + 4)
      ctx.beginPath()
      ctx.moveTo(first[0], first[1])
      for (const p of rest) ctx.lineTo(p[0], p[1])
      ctx.lineTo(w + 400, occludeTo)
      ctx.lineTo(-400, occludeTo)
      ctx.closePath()
      ctx.fillStyle = GROUND
      ctx.fill()
      // Traço só da parte visível, com 2 vizinhos de cada lado (x cresce com o índice; a quina de um vértice
      // de fora não chega à tela). Nas fileiras da frente a linha passa de 7 larguras de tela, e traçar a
      // parte de fora era ~75% do custo do quadro.
      let lo = 0,
        hi = pts.length - 1
      while (lo + 2 < pts.length && pts[lo + 2]![0] < 0) lo++
      while (hi - 2 >= 0 && pts[hi - 2]![0] > w) hi--
      const [s0, ...sRest] = pts.slice(lo, hi + 1)
      if (!s0) continue
      ctx.beginPath()
      ctx.moveTo(s0[0], s0[1])
      for (const p of sRest) ctx.lineTo(p[0], p[1])
      const a = Math.max(0.16, 1 - d / 17) * 1
      ctx.strokeStyle = `rgba(185,192,200,${a})`
      ctx.lineWidth = d < 3 ? 1.8 : 1.1
      ctx.stroke()
    }
  }

  stop() {
    this.stars = []
    super.stop()
  }
}
