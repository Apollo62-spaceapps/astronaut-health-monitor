// Ambiente de execução dos fundos (L6): reduced-motion, visibilidade da aba, tamanho e DPR.
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

/** DPR limitado a 1,5 (custo de pintura cresce com o quadrado do DPR). */
export const MAX_DPR = 1.5
export const capDpr = () => Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, MAX_DPR)

/** Maior dt aceito por quadro, em segundos: depois de uma pausa a animação não "pula". */
export const MAX_DT = 0.05

const REDUCED = '(prefers-reduced-motion: reduce)'
const mql = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED) : null)

/** true quando o sistema pede menos movimento. Atualiza ao vivo (DevTools → Rendering → Emulate). */
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = mql()
      m?.addEventListener('change', cb)
      return () => m?.removeEventListener('change', cb)
    },
    () => mql()?.matches ?? false,
    () => false,
  )
}

/** false quando a aba está oculta: o loop para e a CPU cai a ~0. */
export function usePageVisible() {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener('visibilitychange', cb)
      return () => document.removeEventListener('visibilitychange', cb)
    },
    () => document.visibilityState !== 'hidden',
    () => true,
  )
}

/** Tamanho do elemento em px CSS via ResizeObserver, com debounce (o redimensionamento recria o fundo). */
export function useElementSize(ref: RefObject<HTMLElement | null>, debounceMs = 250) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let first = true
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const next = { w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }
      window.clearTimeout(timer.current)
      if (first) {
        first = false
        return // o primeiro tamanho já é medido na montagem
      }
      timer.current = window.setTimeout(() => setSize(next), debounceMs)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      window.clearTimeout(timer.current)
    }
  }, [ref, debounceMs])
  return size
}
