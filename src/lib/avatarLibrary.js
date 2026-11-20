// Almacén local de modelos de avatar (VRM / zip de Live2D) en la Cache API del navegador.
// Los modelos pesan decenas de MB: no caben en localStorage. La Cache API solo existe en
// contextos seguros (https o localhost); fuera de ellos se guarda solo en memoria.

const CACHE_NAME = 'anki-jack-avatars-v1'
const memory = new Map()
const hasCache = typeof caches !== 'undefined'

const keyUrl = (id) => `/__avatars/${encodeURIComponent(id)}`

export async function getBlob(id) {
  if (!hasCache) return memory.get(id) ?? null
  const res = await (await caches.open(CACHE_NAME)).match(keyUrl(id))
  return res ? res.blob() : null
}

export async function putBlob(id, blob) {
  if (!hasCache) return void memory.set(id, blob)
  await (await caches.open(CACHE_NAME)).put(keyUrl(id), new Response(blob))
}

export async function deleteBlob(id) {
  memory.delete(id)
  if (hasCache) await (await caches.open(CACHE_NAME)).delete(keyUrl(id))
}

/** Ids guardados (para marcar qué modelos ya están descargados). */
export async function listIds() {
  if (!hasCache) return [...memory.keys()]
  const keys = await (await caches.open(CACHE_NAME)).keys()
  return keys.map((req) => decodeURIComponent(new URL(req.url).pathname.replace('/__avatars/', '')))
}

/**
 * Descarga un modelo a través del proxy del backend (los servidores de modelos no
 * siempre permiten CORS), reportando el progreso, y lo guarda.
 * @param {string} id
 * @param {string} url
 * @param {(progress: number) => void} [onProgress] 0..1 (o -1 si no se conoce el tamaño)
 */
export async function download(id, url, onProgress) {
  const res = await fetch(`/api/avatar-download?url=${encodeURIComponent(url)}`)
  if (!res.ok || !res.body) throw new Error(`Error al descargar (${res.status})`)

  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress?.(total ? received / total : -1)
  }

  const blob = new Blob(chunks, { type: res.headers.get('content-type') ?? '' })
  await putBlob(id, blob)
  return blob
}
