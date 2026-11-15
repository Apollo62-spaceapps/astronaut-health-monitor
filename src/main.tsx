import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes empacotadas no build (nada via CDN — NFR-02, DESIGN-SYSTEM §2)
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import App from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
