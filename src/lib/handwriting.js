// Reconocimiento de escritura a mano por trazos con el servicio de Google Input Tools (el que
// usan Google Translate y Gboard). Sin IA ni costo. Es un servicio NO oficial: puede cambiar o
// dejar de estar disponible sin aviso. Permite CORS, así que se llama directo desde el navegador.

const ENDPOINT = 'https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=translate'
// Tamaño de la "hoja" que se le describe a Google; los trazos llegan normalizados (0..1)
const AREA = 1000

// Un solo kanji (CJK unificado, incluida la extensión A)
const isKanji = (s) => /^[㐀-䶿一-鿿豈-﫿]$/u.test(s)

/**
 * @param {Array<Array<{ x: number, y: number, t: number }>>} strokes
 *   trazos en orden; cada uno es una lista de puntos normalizados (0..1) con tiempo en ms
 * @param {{ signal?: AbortSignal, max?: number }} [options]
 * @returns {Promise<string[]>} candidatos (solo kanji), del más al menos probable
 */
export async function recognizeKanji(strokes, { signal, max = 10 } = {}) {
  if (!strokes.length) return []
  const ink = strokes.map((stroke) => [
    stroke.map((p) => Math.round(p.x * AREA)),
    stroke.map((p) => Math.round(p.y * AREA)),
    stroke.map((p) => Math.round(p.t)),
  ])

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      options: 'enable_pre_space',
      requests: [
        {
          writing_guide: { writing_area_width: AREA, writing_area_height: AREA },
          ink,
          language: 'ja',
          max_num_results: 30, // se piden de más porque después se filtran kana y símbolos
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`El reconocedor respondió ${res.status}`)

  // Respuesta: ["SUCCESS", [[id, [candidato, …], …]]]
  const data = await res.json()
  if (data?.[0] !== 'SUCCESS') throw new Error('El reconocedor no pudo procesar el dibujo')
  const candidates = data[1]?.[0]?.[1] ?? []
  return candidates.filter(isKanji).slice(0, max)
}
