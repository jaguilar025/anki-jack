import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "GR4dBIFsYe57TxyrHKXz" } = await req.json()

    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 })

    // Llamada a ElevenLabs TTS
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          use_speaker_boost: false,
          similarity_boost: 1,
          style: 0,
          speed: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer', // recibimos audio binario
      }
    )
    return new Response(response.data, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': response.data.byteLength.toString(),
      },
    })
  } catch (error: any) {
    console.error('ElevenLabs TTS error:', error.response?.data || error.message)
    return NextResponse.json({ error: 'Error generating TTS' }, { status: 500 })
  }
}
