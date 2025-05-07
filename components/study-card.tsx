"use client"

import type React from "react"

import axios from 'axios'
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { Volume2 } from "lucide-react"
import type { Word } from "@/lib/types"
import { useSpeech } from "@/hooks/use-speech"
import { CharacterType } from '@/components/voicevox/types'

// Actualizar la interfaz de props para incluir onSeeAnswer
interface StudyCardProps {
  word: Word
  mode: number
  onAnswer: (isCorrect: boolean) => void
  onSeeAnswer?: () => void
  showResult: boolean
  isCorrect: boolean | null
  onNext: () => void,
  character: CharacterType
}

export function StudyCard({ word, mode, onAnswer, showResult, isCorrect, onNext, onSeeAnswer, character }: StudyCardProps) {
  const [answer, setAnswer] = useState("")
  const [showKana, setShowKana] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { speak, isSpeaking } = useSpeech()
  const [showAnswer, setShowAnswer] = useState(false)
  const [showResultInternal, setShowResultInternal] = useState(showResult)


  useEffect(() => {
    // Focus input when card is shown
    if (inputRef.current && !showResult) {
      inputRef.current.focus()
    }

    // Reset answer when moving to next word
    if (!showResult) {
      setAnswer("")
    }

    // Auto-speak for audio mode
    if (mode === 0 && !showResult) {
      //handlePlayAudio()
    }
  }, [word, showResult, mode, speak])

  // Modificar la función handleSubmit para que no reinicie el estado cuando la respuesta es incorrecta
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (showResult && showAnswer) {
      onNext()
      return
    }

    if (showResult && !showAnswer && isCorrect) {
      onNext()
      return
    }

    let isAnswerCorrect = false

    switch (mode) {
      case 0: // Audio + Writing
      case 1: // Visual + Audio
        isAnswerCorrect =
          answer.trim().toLowerCase() === word.japanese_advance.toLowerCase() ||
          answer.trim().toLowerCase() === word.japanese_basic.toLowerCase()
        break
      case 2: // Translation
        isAnswerCorrect =
          answer.trim().toLowerCase() === word.japanese_advance.toLowerCase() ||
          answer.trim().toLowerCase() === word.japanese_basic.toLowerCase()
        break
    }

    onAnswer(isAnswerCorrect)
  }

  // Modificar la función handleShowAnswer para llamar a onSeeAnswer
  const handleShowAnswer = () => {
    setShowAnswer(true)
    if (onSeeAnswer) {
      onSeeAnswer()
    }
  }

  const handlePlayAudio = async() => {
    await playAudio(word.japanese_basic, character.value)
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

  const renderContent = () => {
    switch (mode) {
      case 0: // Audio + Writing
        return (
          <div className="flex flex-col items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={handlePlayAudio}
            >
              <Volume2 className={`h-8 w-8 ${isSpeaking ? "text-primary animate-pulse" : ""}`} />
            </Button>
            <p className="text-sm text-muted-foreground">Escucha y escribe la palabra en japonés</p>
          </div>
        )

      case 1: // Visual + Audio
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Switch id="show-kana" checked={showKana} onCheckedChange={setShowKana} />
              <Label htmlFor="show-kana">Mostrar kana</Label>
            </div>

            <div className="text-center">
              <h3 className="japanese-text text-2xl font-bold mb-2">
                {showKana ? word.japanese_basic : word.japanese_advance}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={handlePlayAudio} className="mt-2">
                <Volume2 className={`h-4 w-4 mr-1 ${isSpeaking ? "text-primary animate-pulse" : ""}`} />
                Escuchar
              </Button>
            </div>
          </div>
        )

      case 2: // Translation
        return (
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">{word.spanish}</h3>
            <p className="text-sm text-muted-foreground">Escribe la traducción en japonés</p>
          </div>
        )
    }
  }

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          {renderContent()}

          {/* Cambiar la parte del input para que tenga un borde rojo cuando la respuesta es incorrecta
          y permanezca habilitado para escribir inmediatamente */}
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className={`text-center japanese-text ${showResult && !isCorrect && !showAnswer ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={showResult && (isCorrect || showAnswer)}
            />
          </div>

          {/* Modificar la parte que muestra el resultado para eliminar el icono de tache */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-center space-y-2"
              >
                {isCorrect && <div className="text-2xl text-green-500">✓</div>}

                {(isCorrect || showAnswer) && (
                  <>
                    <div className="japanese-text font-bold">
                      {word.japanese_advance}
                      {word.japanese_advance !== word.japanese_basic && (
                        <span className="text-muted-foreground ml-2">({word.japanese_basic})</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{word.spanish}</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Modificar la parte de los botones para eliminar el botón "Intentar de nuevo" */}
        <CardFooter className="flex justify-center p-6 pt-0">
          {showResult && !isCorrect && !showAnswer ? (
            <>
              <Button type="submit" className="flex-1">
                Comprobar
              </Button>
              <Button type="button" onClick={handleShowAnswer} variant="outline" className="flex-1">
                Ver respuesta
              </Button>
            </>
          ) : (
            <Button type="submit" className="w-full">
              {showResult ? "Siguiente" : "Comprobar"}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
