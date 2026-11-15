import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relatieve paden, zodat de app op elke hostingdienst en in elke map werkt.
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    // De economische kalender mag niet rechtstreeks vanuit de browser worden opgehaald.
    // Lokaal haalt dit programma hem op; online zet GitHub het bestand klaar.
    proxy: {
      '/nieuws/thisweek.json': {
        target: 'https://nfs.faireconomy.media',
        changeOrigin: true,
        rewrite: () => '/ff_calendar_thisweek.json',
      },
    },
  },
})
