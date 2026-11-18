import { Hono } from 'hono'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import kanjiData from '../data/kanji_n5.json' with { type: 'json' }

const app = new Hono()

app.post('/', async (c) => {
  try {
    const { image } = await c.req.json()

    if (!image) {
      return c.json({ error: 'No image provided' }, 400)
    }

    const { text: extractedKanji } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: "Extract only the Japanese kanji character from this image. Return only the kanji character, nothing else. If no kanji is found, return '空'. If there is more than one kanji or text, return the first kanji in the text, but always only one kanji.",
            },
            { type: 'image', image },
          ],
        },
      ],
      maxOutputTokens: 10,
    })

    console.log('extractedKanji', extractedKanji)

    const trimmedKanji = extractedKanji?.trim()

    if (!trimmedKanji || trimmedKanji === 'NOT_FOUND') {
      return c.json({ error: 'No kanji found in image' }, 404)
    }

    const foundKanji = kanjiData.find((k) => k.kanji === trimmedKanji)

    if (!foundKanji) {
      return c.json({ error: 'Kanji not found in database' }, 404)
    }

    return c.json({ kanji: foundKanji })
  } catch (error) {
    console.error('Error processing kanji:', error)
    return c.json({ error: 'Failed to process image' }, 500)
  }
})

export default app
