import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Caminhos relativos: o build abre de qualquer pasta (demo offline com `npm run preview`).
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias @/ → src/ (exigido pelo shadcn/ui)
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Padrão: ambiente Node (regras puras de src/domain).
    // Testes de componente declaram `// @vitest-environment jsdom` na primeira linha.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,mjs}'],
  },
})
