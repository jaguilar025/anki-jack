import { Hono } from 'hono'
import axios from 'axios'

const app = new Hono()

app.post('/', async (c) => {
  try {
    const { text, voice = 'GR4dBIFsYe57TxyrHKXz' } = await c.req.json()

    if (!text) return c.json({ error: 'Text is required' }, 400)

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          use_speaker_boost: false,
          similarity_boost: 1,
          style: 0,
          speed: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      },
    )
    return new Response(response.data, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': response.data.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('ElevenLabs TTS error:', error.response?.data || error.message)
    return c.json({ error: 'Error generating TTS' }, 500)
  }
})

export default app
