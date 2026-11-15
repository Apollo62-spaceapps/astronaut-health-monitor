// Fundo animado por ambiente (L6). DECORAÇÃO: não carrega informação, não altera status, regras,
// alertas nem escalonamento (CLAUDE.md §0.3). Lê só `store.environment` e não escreve no store.
//
// - Este arquivo (camada fixa + vinheta) é o único no chunk inicial. O palco (BackdropStage) e cada
//   fundo são chunks próprios, carregados na 1ª vez que o modo é ativado; depois ficam em cache.
// - Dois canvases empilhados (A/B): na troca, o novo entra em 500 ms e o antigo sai; só então o antigo
//   faz stop(). Fora desses 500 ms há uma animação ativa por vez.
// - prefers-reduced-motion: só o quadro estático do aquecimento, sem requestAnimationFrame.
// - Aba oculta: o loop para. Sem canvas 2D, se um import() falhar ou se o palco der erro: gradiente
//   CSS do ambiente (index.css, .backdrop-fallback) e o app segue normal.
import { Component, lazy, Suspense, type ReactNode } from 'react'
import { useAppStore } from '@/state/store'
import { Fallback } from './Fallback'

const BackdropStage = lazy(() => import('./BackdropStage'))

/** Erro no fundo (render ou chunk do palco) nunca derruba o app: cai no gradiente CSS. */
class BackdropBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? <Fallback /> : this.props.children
  }
}

export function EnvironmentBackdrop() {
  const environment = useAppStore((s) => s.environment)
  return (
    <div
      aria-hidden="true"
      data-testid="environment-backdrop"
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
    >
      <BackdropBoundary>
        <Suspense fallback={null}>
          <BackdropStage environment={environment} />
        </Suspense>
      </BackdropBoundary>
      {/* Vinheta: escurece as bordas e o miolo onde ficam os cards. */}
      <div className="backdrop-vignette absolute inset-0" />
    </div>
  )
}
