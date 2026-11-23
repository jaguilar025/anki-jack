import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import audio from './routes/audio.js'
import avatarDownload from './routes/avatar-download.js'
import chat from './routes/chat.js'
import kanjiInfo from './routes/kanji-info.js'
import openaiTts from './routes/openai-tts.js'
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
api.route('/avatar-download', avatarDownload)
api.route('/chat', chat)
api.route('/kanji-info', kanjiInfo)
api.route('/openai-tts', openaiTts)
api.route('/process-kanji', processKanji)
api.route('/tts', tts)
api.route('/tts_version', ttsVersion)
api.route('/version', version)

export default api
