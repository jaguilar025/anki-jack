/**
 * Caché de audios generados (OpenAI TTS) en el navegador, con la Cache API.
 * Cada audio se identifica por proveedor + voz + estilo + texto, así que el
 * mismo texto con la misma voz nunca se vuelve a generar.
 *
 * La Cache API solo existe en contextos seguros (https o localhost). Si no está
 * disponible, todas las funciones se comportan como un caché vacío.
 */

const CACHE_PREFIX = 'anki-jack-audio'
const CACHE_NAME = `${CACHE_PREFIX}-v1`

const isSupported = () => typeof window !== 'undefined' && 'caches' in window

// La Cache API necesita una URL como clave; esta ruta nunca se pide al servidor
const keyToUrl = ({ provider, voice, style, text }) =>
  `/__audio-cache/${provider}/${voice}/${style}/${encodeURIComponent(text)}`

let persistRequested = false
// Pide al navegador que no borre el caché cuando le falte espacio (si lo permite)
function requestPersist() {
  if (persistRequested) return
  persistRequested = true
  navigator.storage?.persist?.().catch(() => {})
}

/** @returns {Promise<ArrayBuffer|null>} */
export async function getCachedAudio(key) {
  if (!isSupported()) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(keyToUrl(key))
    return response ? await response.arrayBuffer() : null
  } catch (e) {
    console.error('Error leyendo el caché de audio:', e)
    return null
  }
}

export async function putCachedAudio(key, data, mime = 'audio/mpeg') {
  if (!isSupported()) return
  try {
    requestPersist()
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      keyToUrl(key),
      new Response(data, { headers: { 'Content-Type': mime, 'Content-Length': String(data.byteLength) } }),
    )
  } catch (e) {
    // Sin espacio u otro error: el audio simplemente no queda guardado
    console.error('Error guardando en el caché de audio:', e)
  }
}

/** @returns {Promise<{ count: number, bytes: number }>} */
export async function getAudioCacheStats() {
  if (!isSupported()) return { count: 0, bytes: 0 }
  let count = 0
  let bytes = 0
  for (const name of await caches.keys()) {
    if (!name.startsWith(CACHE_PREFIX)) continue
    const cache = await caches.open(name)
    for (const request of await cache.keys()) {
      const response = await cache.match(request)
      count++
      bytes += Number(response?.headers.get('Content-Length')) || 0
    }
  }
  return { count, bytes }
}

/** Borra todos los audios guardados (incluidas versiones antiguas del caché) */
export async function clearAudioCache() {
  if (!isSupported()) return
  const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX))
  await Promise.all(names.map((name) => caches.delete(name)))
}
