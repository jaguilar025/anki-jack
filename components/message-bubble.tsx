"use client"

import axios from 'axios'
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Volume2 } from "lucide-react"
import { useSpeech } from "@/hooks/use-speech"
import { CharacterType } from '@/components/voicevox/types'

type Message = {
  role: "user" | "assistant"
  content: string
  translation?: string
}

interface MessageBubbleProps {
  message: Message,
  character: CharacterType
}

export function MessageBubble({ message, character }: MessageBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(true)
  const { speak, isSpeaking } = useSpeech()

  const isAssistant = message.role === "assistant"

  const handleSpeak = async () => {
    await playAudio(message.content, character.value)
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
      }
    }

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`rounded-lg p-3 max-w-[80%] ${
          isAssistant ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <p className="japanese-text text-sm md:text-base">{message.content}</p>

            {isAssistant && (
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleSpeak}>
                <Volume2 className={`h-3 w-3 ${isSpeaking ? "text-primary animate-pulse" : ""}`} />
              </Button>
            )}
          </div>

          {isAssistant && message.translation && showTranslation && (
            <p className="text-xs text-muted-foreground mt-1 italic">{message.translation}</p>
          )}

          {isAssistant && message.translation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs self-start -mt-1 h-6 px-2"
              onClick={() => setShowTranslation(!showTranslation)}
            >
              {showTranslation ? "Ocultar traducción" : "Mostrar traducción"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
