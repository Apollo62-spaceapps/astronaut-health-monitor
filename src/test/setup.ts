// Setup comum dos testes (Vitest).
// jsdom não tem canvas: getContext() só registra "Not implemented" no console e devolve null.
// Aqui ele devolve null em silêncio, como um navegador sem canvas 2D: o fundo decorativo (L6) cai no
// gradiente CSS. Os testes do próprio fundo (backdrops.test.tsx) trocam isso por um contexto falso.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
}
