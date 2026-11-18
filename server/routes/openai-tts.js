import { Hono } from 'hono'

const app = new Hono()

const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar']

// Estilos disponibles. Si cambias el texto de uno, súbele la versión (pirate-v2...)
// para que el caché de audios del navegador no reutilice los audios viejos.
const STYLES = {
  // Estilo "pirate" de openai.fm adaptado: mantiene el japonés claro para estudiar
  'pirate-v1': `Voice: Deep, rugged and hearty, like a cheerful old pirate captain.
Tone: Friendly, spirited and adventurous, with a playful swagger.
Pacing: Slow and deliberate, with short dramatic pauses between phrases.
Pronunciation: Speak standard Tokyo Japanese. Keep every mora, long vowel, double consonant (っ) and pitch accent clear and correct, because the listener is a Japanese learner. Do not add or change any words.`,
}

// Voz japonesa de respaldo cuando VoiceVox no está disponible y el
// dispositivo no tiene voz japonesa en el navegador.
app.post('/', async (c) => {
  try {
    const { text, voice = 'marin', style = 'pirate-v1' } = await c.req.json()

    if (!text) return c.json({ error: 'Text is required' }, 400)
    if (text.length > 1000) return c.json({ error: 'Text too long' }, 400)
    if (!VOICES.includes(voice)) return c.json({ error: 'Unknown voice' }, 400)
    if (!STYLES[style]) return c.json({ error: 'Unknown style' }, 400)

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        instructions: STYLES[style],
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      console.error('OpenAI TTS error:', response.status, await response.text())
      return c.json({ error: 'Error generating TTS' }, 500)
    }

    const audio = await response.arrayBuffer()
    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audio.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('OpenAI TTS error:', error.message)
    return c.json({ error: 'Error generating TTS' }, 500)
  }
})

export default app
