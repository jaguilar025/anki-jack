import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFile } from 'node:fs/promises'

import api from './app.js'

// Servidor Node para desarrollo local y `npm start`. En Vercel se usa api/index.js
const app = new Hono()
app.route('/', api)

if (process.env.NODE_ENV === 'production') {
  app.use('*', serveStatic({ root: './dist' }))
  // Fallback SPA
  app.get('*', async (c) => {
    if (c.req.path.startsWith('/api')) return c.notFound()
    return c.html(await readFile('./dist/index.html', 'utf-8'))
  })
}

const port = Number(process.env.API_PORT) || 8787
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API escuchando en http://localhost:${info.port}`)
})
