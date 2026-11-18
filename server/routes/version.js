import { Hono } from 'hono'
import axios from 'axios'

const app = new Hono()

app.get('/', async (c) => {
  try {
    await axios.get(`${process.env.VOICEVOX_URL}/health`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    return c.json({ status: 'ok' })
  } catch (error) {
    console.error('Error en /api/health:', error)
    return c.json({ status: 'error' }, 500)
  }
})

export default app
