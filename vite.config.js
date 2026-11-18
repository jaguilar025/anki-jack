import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import process from 'node:process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// HTTPS opcional (necesario para micrófono/cámara desde el móvil en la red local).
// Usa los certificados mkcert copiados de anki-jack: `npm run dev:https`
const useHttps = process.env.HTTPS === '1'
const https = useHttps
  ? {
      key: fs.readFileSync('./certs/localhost+1-key.pem'),
      cert: fs.readFileSync('./certs/localhost+1.pem'),
    }
  : undefined

const API_PORT = process.env.API_PORT || 8787

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    https,
    host: useHttps ? true : undefined,
    port: useHttps ? 3001 : undefined,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
})
