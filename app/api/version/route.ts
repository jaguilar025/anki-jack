import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  try {
    const { data } = await axios.get(`${process.env.VOICEVOX_URL}/version`)
    console.log("data", data);
    // Devuelve directamente el data (sin anidarlo en otro objeto)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en /api/version:', error)
    return NextResponse.json(
      { error: 'Error al obtener versión' },
      { status: 500 }
    )
  }
}