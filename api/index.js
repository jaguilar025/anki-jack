import { handle } from 'hono/vercel'

import api from '../server/app.js'

// Función serverless de Vercel. vercel.json reescribe /api/* hacia aquí;
// la URL original se conserva, así que Hono enruta igual que en local.
const handler = handle(api)

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
