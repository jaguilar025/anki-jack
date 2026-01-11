// app/api/tts/health/route.ts
import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
    const response = await axios.get(
      "https://api.elevenlabs.io/v2/voices",
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        timeout: 3000, // respuesta rápida
      }
    );

    return NextResponse.json({
      ok: true,
      voicesCount: response.data.voices?.length ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.response?.status || "unknown",
      },
      { status: 503 }
    );
  }
}
