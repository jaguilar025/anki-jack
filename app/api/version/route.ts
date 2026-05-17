import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  try {
    const { data } = await axios.get(`${process.env.VOICEVOX_URL}/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error en /api/health:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}