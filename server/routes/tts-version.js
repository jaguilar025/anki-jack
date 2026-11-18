import { Hono } from 'hono'
import axios from 'axios'

const app = new Hono()

app.get('/', async (c) => {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v2/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      timeout: 3000,
    })
    return c.json({ ok: true, voicesCount: response.data.voices?.length ?? 0 })
  } catch (error) {
    return c.json({ ok: false, error: error.response?.status || 'unknown' }, 503)
  }
})

export default app
