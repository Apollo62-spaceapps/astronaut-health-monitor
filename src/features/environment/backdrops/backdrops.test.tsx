// @vitest-environment jsdom
// Fundos por ambiente (L6): decoração, lazy, crossfade, um loop só, reduced-motion e fallback.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import App from '@/app/App'
import { useAppStore } from '@/state/store'
import { EnvironmentBackdrop } from './EnvironmentBackdrop'
import type { CanvasBackdrop } from './backdrop'

// O chunk da Space Station "falha ao carregar" neste arquivo, para testar o fallback do import().
vi.mock('./StationBackdrop', () => {
  throw new Error('chunk indisponível (simulado)')
})

/** Contexto 2D falso: aceita qualquer chamada e conta os desenhos. */
function fakeContext() {
  const calls = { draw: 0 }
  const gradient = { addColorStop: () => undefined }
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get(target, key) {
      if (key in target) return target[key]
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient
      return () => {
        calls.draw++
      }
    },
    set(target, key, value) {
      target[key] = value
      return true
    },
  })
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

const originalGetContext = HTMLCanvasElement.prototype.getContext
let calls: { draw: number }

function withCanvas() {
  const f = fakeContext()
  calls = f.calls
  HTMLCanvasElement.prototype.getContext = (() => f.ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext
}

function mockReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: matches && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
}

const canvases = () => [...document.querySelectorAll('[data-testid="environment-backdrop"] canvas')] as HTMLCanvasElement[]
const shown = () => canvases().filter((c) => c.style.opacity === 'var(--backdrop-opacity)')
// O palco e cada fundo chegam por import() lazy: sob a suíte inteira isso passa de 1 s (padrão do waitFor).
const LAZY = { timeout: 10_000 }

/** Canvas com bitmap alocado por um fundo (sem atributo width ele nunca foi usado; stop() zera). */
const alive = () => canvases().filter((c) => c.hasAttribute('width') && c.width > 0)

beforeEach(() => {
  localStorage.clear()
  useAppStore.getState().resetScenario()
  useAppStore.setState({ environment: 'EARTH', role: 'ASTRONAUT', aiMode: 'protocol' })
  // @ts-expect-error jsdom não tem matchMedia; cada teste define o seu
  delete window.matchMedia
})
afterEach(() => {
  cleanup()
  HTMLCanvasElement.prototype.getContext = originalGetContext
  vi.restoreAllMocks()
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

describe('Fundo por ambiente (L6) — decoração', () => {
  it('fica atrás de tudo, sem foco nem clique, e escondido do leitor de tela', () => {
    render(<App />)
    const bd = screen.getByTestId('environment-backdrop')
    expect(bd.getAttribute('aria-hidden')).toBe('true')
    expect(bd.className).toContain('pointer-events-none')
    expect(bd.className).toContain('fixed')
    expect(bd.className).toContain('z-[-1]')
    expect(bd.querySelector('button, a, input, [tabindex]')).toBeNull()
  })

  it('sem canvas 2D: cai no gradiente CSS do ambiente e o app segue (sem tela branca)', async () => {
    render(<App />) // o setup dos testes faz getContext() devolver null
    expect(await screen.findByTestId('backdrop-fallback', {}, { timeout: 10_000 })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  })

  it('não escreve no store', () => {
    withCanvas()
    const before = JSON.stringify(useAppStore.getState())
    render(<EnvironmentBackdrop />)
    expect(JSON.stringify(useAppStore.getState())).toBe(before)
  })
})

describe('Fundo por ambiente (L6) — ciclo de vida', () => {
  it('monta o fundo do ambiente com o aquecimento e mostra um canvas só', async () => {
    withCanvas()
    mockReducedMotion(false)
    render(<EnvironmentBackdrop />)
    await waitFor(() => expect(shown()).toHaveLength(1), LAZY)
    expect(alive()).toHaveLength(1)
    expect(calls.draw).toBeGreaterThan(0) // 90 passos de aquecimento já pintaram
  })

  it('crossfade: o novo entra, o antigo sai e faz stop() depois da transição', async () => {
    withCanvas()
    mockReducedMotion(false)
    render(<EnvironmentBackdrop />)
    await waitFor(() => expect(shown()).toHaveLength(1), LAZY)
    const first = shown()[0]!

    act(() => useAppStore.getState().setEnvironment('SPACECRAFT'))
    await waitFor(() => expect(first.style.opacity).toBe('0'), LAZY) // espera o chunk do novo fundo
    expect(shown()).toHaveLength(1)
    expect(shown()[0]).not.toBe(first)
    expect(alive()).toHaveLength(2) // durante os 500 ms os dois existem
    await waitFor(() => expect(alive()).toHaveLength(1), LAZY)
    expect(first.width).toBe(0) // bitmap liberado
  })

  it('20 trocas rápidas: no fim sobra um único canvas ativo', async () => {
    withCanvas()
    mockReducedMotion(false)
    render(<EnvironmentBackdrop />)
    const modes = ['EARTH', 'SPACECRAFT', 'LUNAR'] as const
    for (let i = 0; i < 20; i++) act(() => useAppStore.getState().setEnvironment(modes[i % 3]!))
    await waitFor(() => expect(shown()).toHaveLength(1), LAZY)
    await waitFor(() => expect(alive()).toHaveLength(1), LAZY)
  })

  it('prefers-reduced-motion: desenha o quadro estático e não inicia requestAnimationFrame', async () => {
    withCanvas()
    mockReducedMotion(true)
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    render(<EnvironmentBackdrop />)
    await waitFor(() => expect(shown()).toHaveLength(1), LAZY)
    expect(calls.draw).toBeGreaterThan(0)
    expect(raf).not.toHaveBeenCalled()
  })

  it('aba oculta: o loop não roda', async () => {
    withCanvas()
    mockReducedMotion(false)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    render(<EnvironmentBackdrop />)
    await waitFor(() => expect(shown()).toHaveLength(1), LAZY)
    expect(raf).not.toHaveBeenCalled()

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(raf).toHaveBeenCalled()
  })

  it('se o import() do fundo falhar: gradiente CSS, sem quebrar', async () => {
    withCanvas()
    mockReducedMotion(false)
    render(<EnvironmentBackdrop />)
    act(() => useAppStore.getState().setEnvironment('ISS'))
    await waitFor(() => expect(screen.getByTestId('backdrop-fallback')).toBeTruthy(), LAZY)
  })
})

describe('Fundo por ambiente (L6) — as 4 classes portadas', () => {
  it.each([
    ['Earth', () => import('./EarthBackdrop').then((m) => m.EarthBackdrop)],
    ['Station', () => vi.importActual<typeof import('./StationBackdrop')>('./StationBackdrop').then((m) => m.StationBackdrop)],
    ['Moon', () => import('./MoonBackdrop').then((m) => m.MoonBackdrop)],
    ['Spacecraft', () => import('./SpacecraftBackdrop').then((m) => m.SpacecraftBackdrop)],
  ])('%s: start → resize (DPR aplicado) → frame → stop libera o canvas', async (_name, load) => {
    withCanvas()
    const Ctor = (await load()) as new () => CanvasBackdrop
    const canvas = document.createElement('canvas')
    const bd = new Ctor()
    expect(bd.start(canvas)).toBe(true)
    bd.resize(800, 500, 1.5)
    expect([canvas.width, canvas.height]).toEqual([1200, 750])
    const before = calls.draw
    bd.frame(1, 0.016)
    expect(calls.draw).toBeGreaterThan(before)
    bd.stop()
    expect(canvas.width).toBe(0)
  })

  it('sem contexto 2D, start() devolve false', async () => {
    const { EarthBackdrop } = await import('./EarthBackdrop')
    expect(new EarthBackdrop().start(document.createElement('canvas'))).toBe(false)
  })
})
