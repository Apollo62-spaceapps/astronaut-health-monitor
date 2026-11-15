// Palco dos fundos (L6), carregado em lazy pelo EnvironmentBackdrop para não crescer o chunk inicial.
// Detalhes de comportamento no cabeçalho de EnvironmentBackdrop.tsx.
import { useEffect, useRef, useState } from 'react'
import type { MissionMode } from '@/domain/types'
import type { Backdrop } from './backdrop'
import { Fallback } from './Fallback'
import { capDpr, MAX_DT, useElementSize, usePageVisible, useReducedMotion } from './useBackdropRuntime'

type BackdropCtor = new () => Backdrop

const LOADERS: Record<MissionMode, () => Promise<BackdropCtor>> = {
  EARTH: () => import('./EarthBackdrop').then((m) => m.EarthBackdrop),
  ISS: () => import('./StationBackdrop').then((m) => m.StationBackdrop),
  LUNAR: () => import('./MoonBackdrop').then((m) => m.MoonBackdrop),
  SPACECRAFT: () => import('./SpacecraftBackdrop').then((m) => m.SpacecraftBackdrop),
}
const loaded = new Map<MissionMode, Promise<BackdropCtor>>()
function loadBackdrop(mode: MissionMode) {
  let p = loaded.get(mode)
  if (!p) {
    p = LOADERS[mode]()
    p.catch(() => loaded.delete(mode)) // falhou: tenta de novo na próxima troca
    loaded.set(mode, p)
  }
  return p
}

/** Duração do crossfade (igual ao `transition` do canvas). O antigo para um pouco depois. */
const FADE_MS = 500
const STOP_AFTER_MS = FADE_MS + 200

interface Layer {
  bd: Backdrop | null
  timer: number | undefined
}
const CANVAS_CLASS = 'absolute inset-0 size-full opacity-0 transition-opacity duration-500 ease-in-out'
type Slot = 0 | 1
const otherSlot = (i: Slot): Slot => (i === 0 ? 1 : 0)

export default function BackdropStage({ environment }: { environment: MissionMode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasA = useRef<HTMLCanvasElement>(null)
  const canvasB = useRef<HTMLCanvasElement>(null)
  const layers = useRef<[Layer, Layer]>([
    { bd: null, timer: undefined },
    { bd: null, timer: undefined },
  ])
  const active = useRef<Slot | null>(null)
  const canvasOk = useRef<boolean | null>(null)
  const [failed, setFailed] = useState(false)
  const reduced = useReducedMotion()
  const visible = usePageVisible()
  const size = useElementSize(rootRef)

  const canvasAt = (slot: Slot) => (slot === 0 ? canvasA.current : canvasB.current)

  const measure = () => {
    const el = rootRef.current
    return { w: el?.clientWidth || window.innerWidth, h: el?.clientHeight || window.innerHeight }
  }

  const stopLayer = (layer: Layer) => {
    window.clearTimeout(layer.timer)
    layer.timer = undefined
    layer.bd?.stop()
    layer.bd = null
  }

  // Troca de ambiente: carrega a classe (chunk), monta no canvas livre e faz o crossfade.
  useEffect(() => {
    if (failed) return
    if (canvasOk.current === null) canvasOk.current = !!canvasA.current?.getContext('2d')
    if (!canvasOk.current) {
      setFailed(true)
      return
    }
    let cancelled = false
    loadBackdrop(environment)
      .then((Ctor) => {
        if (cancelled) return
        const prev = active.current
        const next: Slot = prev === null ? 0 : otherSlot(prev)
        const canvas = canvasAt(next)
        if (!canvas) return
        const layer = layers.current[next]
        stopLayer(layer) // se ainda estava saindo, para já
        const bd = new Ctor()
        if (!bd.start(canvas)) {
          setFailed(true)
          return
        }
        const { w, h } = measure()
        bd.resize(w, h, capDpr())
        layer.bd = bd
        canvas.style.opacity = 'var(--backdrop-opacity)'
        if (prev !== null) {
          const old = layers.current[prev]
          const oldCanvas = canvasAt(prev)
          if (oldCanvas) oldCanvas.style.opacity = '0'
          window.clearTimeout(old.timer)
          old.timer = window.setTimeout(() => stopLayer(old), STOP_AFTER_MS)
        }
        active.current = next
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // canvasA/canvasB e layers são refs estáveis.
  }, [environment, failed])

  // Redimensionou: recria o fundo ativo (como o build() do arquivo) e solta o que estava saindo.
  useEffect(() => {
    const i = active.current
    if (!size || failed || i === null) return
    const o = otherSlot(i)
    stopLayer(layers.current[o])
    const otherCanvas = canvasAt(o)
    if (otherCanvas) otherCanvas.style.opacity = '0'
    layers.current[i].bd?.resize(size.w, size.h, capDpr())
  }, [size, failed])

  // Loop: só com movimento permitido, aba visível e canvas funcionando.
  useEffect(() => {
    if (reduced || !visible || failed) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000))
      last = now
      try {
        for (const l of layers.current) l.bd?.frame(now / 1000, dt)
      } catch {
        setFailed(true)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [reduced, visible, failed])

  // Falhou ou desmontou: solta tudo.
  useEffect(() => {
    const ls = layers.current
    if (failed) ls.forEach(stopLayer)
    return () => ls.forEach(stopLayer)
  }, [failed])

  return (
    <div ref={rootRef} className="absolute inset-0">
      {failed ? (
        <Fallback />
      ) : (
        <>
          <canvas ref={canvasA} className={CANVAS_CLASS} />
          <canvas ref={canvasB} className={CANVAS_CLASS} />
        </>
      )}
    </div>
  )
}

