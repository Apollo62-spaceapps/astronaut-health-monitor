// Setup comum dos testes (Vitest).
import { configure } from '@testing-library/dom'

// jsdom não tem canvas: getContext() só registra "Not implemented" no console e devolve null.
// Aqui ele devolve null em silêncio, como um navegador sem canvas 2D: o fundo decorativo (L6) cai no
// gradiente CSS. Os testes do próprio fundo (backdrops.test.tsx) trocam isso por um contexto falso.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
}

// Telas e o runtime do Orbit são carregados sob demanda (L6/L7). Com a suíte inteira em paralelo, o primeiro
// import() passa de 1 s (padrão do findBy/waitFor). Só aumenta a espera máxima; quem já passa não fica mais lento.
configure({ asyncUtilTimeout: 10_000 })
