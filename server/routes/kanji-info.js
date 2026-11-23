import { Hono } from 'hono'
import kanjidic from '../data/kanjidic.json' with { type: 'json' }
import kanjiN5 from '../data/kanji_n5.json' with { type: 'json' }

/**
 * Ficha de un kanji: GET /api/kanji-info?k=食
 * Datos de KANJIDIC2 (~10,000 kanji; generado con scripts/build-kanjidic.mjs). Si el kanji es de
 * N5 se agrega el vocabulario de ejemplo de server/data/kanji_n5.json.
 *
 * Respuesta: { kanji: { kanji, meanings[], onyomi[], kunyomi[], nanori[], strokes, grade,
 *   jlptOld, frequency, vocabulary?: [{ jp, pron, en }] } }
 */
const app = new Hono()
const n5ByKanji = new Map(kanjiN5.map((k) => [k.kanji, k]))

app.get('/', (c) => {
  const k = c.req.query('k')?.trim()
  if (!k) return c.json({ error: 'Falta el kanji' }, 400)
  const entry = kanjidic.kanji[k]
  if (!entry) return c.json({ error: 'Kanji not found in database' }, 404)

  const n5 = n5ByKanji.get(k)
  return c.json({
    kanji: {
      kanji: k,
      meanings: entry.m ?? [],
      onyomi: entry.on ?? [],
      kunyomi: entry.kun ?? [],
      nanori: entry.nanori ?? [],
      strokes: entry.s ?? null,
      grade: entry.g ?? null,
      jlptOld: entry.j ?? null,
      frequency: entry.f ?? null,
      ...(n5?.vocabulary?.length && { vocabulary: n5.vocabulary }),
    },
  })
})

export default app
