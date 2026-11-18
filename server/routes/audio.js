import { Hono } from 'hono'
import axios from 'axios'

const app = new Hono()

app.post('/', async (c) => {
  try {
    const { text, speaker } = await c.req.json()

    const responseSynthesis = await axios.post(
      `${process.env.VOICEVOX_URL}/tts`,
      { text, speaker },
      {
        responseType: 'arraybuffer',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${process.env.VOICEVOX_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    )

    const base64Data = Buffer.from(responseSynthesis.data).toString('base64')
    return c.json({ response: base64Data })
  } catch (error) {
    console.log('error', error)
    return c.json({ error: 'Error al sintetizar voz' }, 500)
  }
})

export default app
