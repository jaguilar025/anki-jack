import { Hono } from 'hono'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

// Modelo de la conversación. Razonamiento apagado: respuestas cortas y rápidas, y los
// tokens de "pensar" se cobran como salida (encarecerían cada respuesta).
const CHAT_MODEL = 'gpt-6-luna'
const REASONING_EFFORT = 'none'

const app = new Hono()

app.post('/', async (c) => {
  try {
    const { messages } = await c.req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: 'Se requieren mensajes para la conversación' }, 400)
    }

    // AI SDK v7 no admite mensajes `system` dentro de `messages`: van en `instructions`
    const instructions = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const conversation = messages.filter((m) => m.role !== 'system')

    const result = await generateText({
      model: openai(CHAT_MODEL),
      providerOptions: { openai: { reasoningEffort: REASONING_EFFORT } },
      ...(instructions && { instructions }),
      // Al iniciar la conversación solo llega el mensaje de sistema
      ...(conversation.length ? { messages: conversation } : { prompt: 'Comienza la conversación.' }),
    })

    return c.json({ message: { role: 'assistant', content: result.text } })
  } catch (error) {
    console.error('Error en la API de chat:', error)
    return c.json({ error: 'Error al procesar la solicitud' }, 500)
  }
})

export default app
