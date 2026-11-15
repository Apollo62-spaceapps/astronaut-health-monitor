import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes empacotadas no build (nada via CDN — NFR-02, DESIGN-SYSTEM §2)
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css' // números em peso 600 (cards, contagem da faixa, títulos) sem negrito falso
import './index.css'
import App from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
