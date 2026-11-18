import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import audio from './routes/audio.js'
import chat from './routes/chat.js'
import processKanji from './routes/process-kanji.js'
import tts from './routes/tts.js'
import ttsVersion from './routes/tts-version.js'
import version from './routes/version.js'

/**
 * Rutas /api/*. Se comparte entre el servidor Node local (server/index.js)
 * y la función serverless de Vercel (api/index.js).
 */
const api = new Hono().basePath('/api')
// La imagen va en base64 dentro del JSON
api.use('*', bodyLimit({ maxSize: 25 * 1024 * 1024 }))
api.route('/audio', audio)
api.route('/chat', chat)
api.route('/process-kanji', processKanji)
api.route('/tts', tts)
api.route('/tts_version', ttsVersion)
api.route('/version', version)

export default api
