import { Hono } from 'hono'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

const app = new Hono()

app.post('/', async (c) => {
  try {
    const { messages } = await c.req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: 'Se requieren mensajes para la conversación' }, 400)
    }

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages,
    })

    // Si la respuesta no contiene traducción (salto de línea), añadir una nota
    const content = result.text.includes('\n')
      ? result.text
      : `${result.text}\nTraducción no disponible.`

    return c.json({ message: { role: 'assistant', content } })
  } catch (error) {
    console.error('Error en la API de chat:', error)
    return c.json({ error: 'Error al procesar la solicitud' }, 500)
  }
})

export default app
