"use client"

import type React from "react"
import axios from 'axios'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { useSpeech } from "@/hooks/use-speech"

import { CharacterStyleType } from '@/components/voicevox/types'
import { Characters } from '@/components/voicevox/config'

import  Main  from '@/components/voicevox/main'

type Message = {
  role: "user" | "assistant"
  content: string
  translation?: string
}

export default function ConversationPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [level, setLevel] = useState("beginner")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationStarted, setConversationStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { speak, isSpeaking } = useSpeech()
  const [character, setCharacter] = useState<CharacterStyleType>(
    {name:Characters[0].name,
      value: Characters[0].styles[0].id.toString(),
      word: Characters[0].word
    })

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Start conversation when level is selected
  const startConversation = async () => {
    setConversationStarted(true)
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Eres un asistente de conversación en japonés para un estudiante de nivel ${level}. 
              Inicia una conversación simple en japonés apropiada para este nivel. 
              Usa principalmente hiragana y katakana para principiantes, añade kanji básico para intermedios, 
              y kanji más avanzado para avanzados. Siempre proporciona la traducción al español después de cada mensaje en japonés.
              Usa frases cortas y vocabulario apropiado para el nivel.
              Para principiantes: saludos, presentaciones, preguntas simples.
              Para intermedios: hobbies, rutina diaria, opiniones simples.
              Para avanzados: temas de actualidad, cultura, opiniones más complejas.
              Preséntate, refierete siempre a ti mismo bajo el nombre de ${character.name} y haz una pregunta simple para iniciar la conversación.`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error("Error al iniciar la conversación")
      }

      const data = await response.json()

      // Verificar que data.message.content existe y es un string
      if (data.message && typeof data.message.content === "string") {
        // Intentar separar el mensaje japonés de la traducción
        const parts = data.message.content.split(/\n+/)
        const japaneseText = parts[0] || data.message.content
        const translation = parts.length > 1 ? parts[1] : ""

        setMessages([
          {
            role: "assistant",
            content: japaneseText.trim(),
            translation: translation.trim(),
          },
        ])

        // Reproducir el mensaje en japonés
        await playAudio(japaneseText.trim(), character.value)

      } else {
        // Manejar el caso donde la respuesta no tiene el formato esperado
        console.error("Formato de respuesta inesperado:", data)
        setMessages([
          {
            role: "assistant",
            content: "こんにちは！会話を始めましょう。",
            translation: "¡Hola! Vamos a comenzar una conversación.",
          },
        ])
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Eres un asistente de conversación en japonés para un estudiante de nivel ${level}. 
              Responde en japonés apropiado para este nivel y proporciona una traducción al español.
              Usa principalmente hiragana y katakana para principiantes, añade kanji básico para intermedios, 
              y kanji más avanzado para avanzados.
              Mantén las respuestas cortas y naturales. Si el usuario comete errores, corrige sutilmente en tu respuesta.
              Si el usuario escribe en español, responde como si estuvieras enseñándole cómo decir eso en japonés.
              Refierete a ti mismo bajo el nombre de ${character.name}.
              Siempre proporciona la traducción al español después de cada mensaje en japonés.`,
            },
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: "user", content: userMessage },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error("Error al enviar el mensaje")
      }

      const data = await response.json()

      // Verificar que data.message.content existe y es un string
      if (data.message && typeof data.message.content === "string") {
        // Intentar separar el mensaje japonés de la traducción
        const parts = data.message.content.split(/\n+/)
        const japaneseText = parts[0] || data.message.content
        const translation = parts.length > 1 ? parts[1] : ""

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: japaneseText.trim(),
            translation: translation.trim(),
          },
        ])

        // Reproducir el mensaje en japonés
        await playAudio(japaneseText.trim(), character.value)
      } else {
        // Manejar el caso donde la respuesta no tiene el formato esperado
        console.error("Formato de respuesta inesperado:", data)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "すみません、エラーが発生しました。",
            translation: "Lo siento, ha ocurrido un error.",
          },
        ])
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "すみません、エラーが発生しました。",
          translation: "Lo siento, ha ocurrido un error.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

    // 音声再生
    const playAudio = async (text: string, speaker: string) => {
      console.log("star playing:" + text);
      try {
        // 音声取得
        console.log("await start");
        const responseAudio = await axios.post('/api/audio', {
          text,
          speaker,
        })
        console.log("await end wit data:", responseAudio);
    
        // Base64形式で取得
        const base64Audio = responseAudio?.data?.response
        // Bufferに変換
        const byteArray = Buffer.from(base64Audio, 'base64')
        // Blobに変換
        const audioBlob = new Blob([byteArray], { type: 'audio/x-wav' })
        // URLに変換
        const audioUrl = URL.createObjectURL(audioBlob)
        // 音声作成
        const audio = new Audio(audioUrl)
        // 音量[0-1]設定
        audio.volume = 1
        // 再生
        console.log("star playing");
        audio.play()
        console.log("end playing");
      } catch (e) {
        console.error(e)
        speak(text);
      }
    }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-background/90">
      <header className="p-4 border-b flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-lg font-bold">会話練習 (Práctica de Conversación)</h1>
        <div className="w-8"></div> {/* Spacer for centering */}
      </header>

      {!conversationStarted ? (
        <div className="flex-1 flex items-center justify-center p-4">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-6 bg-card rounded-lg border border-border"
          >
            <h2 className="text-xl font-bold mb-6 text-center">Selecciona tu nivel</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nivel de japonés</label>
                <Select onValueChange={setLevel} value={level}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Principiante</SelectItem>
                    <SelectItem value="intermediate">Intermedio</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
                <Main handlesetCharacter={setCharacter}/>
              </div>

              <Button onClick={startConversation} className="w-full" disabled={!character}>
                Iniciar Conversación
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        <ChatInterface
          character={character}
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
      )}
    </div>
  )
}
