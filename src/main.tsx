import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes empacotadas no build (nada via CDN — NFR-02, DESIGN-SYSTEM §2)
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import './index.css'
import App from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
