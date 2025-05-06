import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Verificar que hay mensajes
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Se requieren mensajes para la conversación" }, { status: 400 })
    }

    // Obtener la respuesta del modelo
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages,
    })

    // Asegurarnos de que la respuesta tenga el formato esperado
    // Verificar si la respuesta ya contiene una traducción (con un salto de línea)
    if (!result.text.includes("\n")) {
      // Si no hay traducción, añadir una nota
      const response = `${result.text}\nTraducción no disponible.`

      return NextResponse.json({
        message: {
          role: "assistant",
          content: response,
        },
      })
    }

    // Devolver la respuesta
    return NextResponse.json({
      message: {
        role: "assistant",
        content: result.text,
      },
    })
  } catch (error) {
    console.error("Error en la API de chat:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}
