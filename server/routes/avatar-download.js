import { Hono } from 'hono'

/**
 * Proxy de descarga de modelos de avatar (VRM / Live2D) para servidores sin CORS.
 * GET /api/avatar-download?url=https://...
 * Solo se permiten los hosts de la lista, para que no sea un proxy abierto.
 */
const ALLOWED_HOSTS = new Set([
  'dist.ayaka.moe', // modelos de ejemplo que usa AIRI
])

const app = new Hono()

app.get('/', async (c) => {
  let target
  try {
    target = new URL(c.req.query('url') ?? '')
  } catch {
    return c.json({ error: 'URL inválida' }, 400)
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return c.json({ error: 'Host no permitido' }, 403)
  }

  const upstream = await fetch(target)
  if (!upstream.ok || !upstream.body) {
    return c.json({ error: `Error al descargar (${upstream.status})` }, 502)
  }

  // Se reenvía en streaming; content-length permite mostrar el progreso
  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
  })
  const length = upstream.headers.get('content-length')
  if (length) headers.set('Content-Length', length)
  return new Response(upstream.body, { headers })
})

export default app
