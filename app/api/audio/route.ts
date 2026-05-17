import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const HEADERS = {
  'ngrok-skip-browser-warning': 'true',
  'Authorization': `Bearer ${process.env.VOICEVOX_TOKEN}`
}

export async function POST(req: NextRequest) {
  try {
    const { text, speaker } = await req.json()

    const responseSynthesis = await axios.post(
      `${process.env.VOICEVOX_URL}/tts`,
      { text, speaker },
      {
        responseType: 'arraybuffer',
        headers: { ...HEADERS, 'Content-Type': 'application/json' }
      }
    )

    const base64Data = Buffer.from(responseSynthesis.data, 'binary').toString('base64')
    return NextResponse.json({ response: base64Data })

  } catch (error) {
    console.log('error', error)
    return NextResponse.json({ error: 'Error al sintetizar voz' }, { status: 500 })
  }
}