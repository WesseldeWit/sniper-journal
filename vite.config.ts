import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relatieve paden, zodat de app op elke hostingdienst en in elke map werkt.
  base: './',
  plugins: [react()],
  server: { port: 5173 },
})
