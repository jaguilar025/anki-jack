import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFile } from 'node:fs/promises'

import audio from './routes/audio.js'
import chat from './routes/chat.js'
import processKanji from './routes/process-kanji.js'
import tts from './routes/tts.js'
import ttsVersion from './routes/tts-version.js'
import version from './routes/version.js'

const app = new Hono()

const api = new Hono()
// La imagen va en base64 dentro del JSON
api.use('*', bodyLimit({ maxSize: 25 * 1024 * 1024 }))
api.route('/audio', audio)
api.route('/chat', chat)
api.route('/process-kanji', processKanji)
api.route('/tts', tts)
api.route('/tts_version', ttsVersion)
api.route('/version', version)
app.route('/api', api)

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
