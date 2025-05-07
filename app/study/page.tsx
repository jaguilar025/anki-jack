"use client"

import axios from 'axios'

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { StudyCard } from "@/components/study-card"
import { ProgressBar } from "@/components/progress-bar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getAllCategories } from "@/lib/data"
import { motion } from "framer-motion"
import { getUserProgress, updateUserProgress } from "@/lib/storage"
import type { Word } from "@/lib/types"
import { ScoreDisplay } from "@/components/score-display"

import  Main  from '@/components/voicevox/main'
import { CharacterStyleType } from '@/components/voicevox/types'
import { Characters } from '@/components/voicevox/config'
import { useSpeech } from "@/hooks/use-speech"

export default function StudyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const categoryParam = searchParams.get("category")
  const modeParam = searchParams.get("mode")

  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [words, setWords] = useState<Word[]>([])
  const { speak, isSpeaking } = useSpeech()
  const [character, setCharacter] = useState<CharacterStyleType>(
      {name:Characters[0].name,
        value: Characters[0].styles[0].id.toString(),
        word: Characters[0].word
      })

  useEffect(() => {
    if (!categoryParam || !modeParam) {
      router.push("/")
      return
    }

    // Obtener todas las categorías (predefinidas + personalizadas)
    const allCategories = getAllCategories()
    const categoryWords = allCategories[categoryParam]

    if (!categoryWords) {
      router.push("/")
      return
    }

    // Shuffle words
    const shuffled = [...categoryWords].sort(() => Math.random() - 0.5)
    setWords(shuffled)

    // Load progress
    const progress = getUserProgress()
    const categoryProgress = progress[categoryParam] || {}
    const modeProgress = categoryProgress[modeParam] || { score: 0 }

    setScore(modeProgress.score || 0)
  }, [categoryParam, modeParam, router])

  const handleAnswer = async (isAnswerCorrect: boolean) => {
    setIsCorrect(isAnswerCorrect)
    setShowResult(true)

    if (isAnswerCorrect) {
      setScore((prev) => prev + 10)
      const correct_messages = [
        "正解です！",
        "合っています！",
        "その通りです！",
        "まるです！",
        "よくできました！",
        "完璧です！"
      ];
      const correct_audio = correct_messages[Math.floor(Math.random() * correct_messages.length)];
      await playAudio(correct_audio, character.value)
      //playCorrect()

      // Save progress only on correct answers
      if (categoryParam && modeParam) {
        updateUserProgress(categoryParam, modeParam, 10)
      }
    } else {
      const incorrect_messages = [
        "不正解です！",
        "違います！",
        "間違いです！",
        "残念、不正解です。",
        "それは間違っています！"
      ];
      const incorrect_audio = incorrect_messages[Math.floor(Math.random() * incorrect_messages.length)];
      await playAudio(incorrect_audio, character.value)
      //playIncorrect()
      // No reducimos vidas aquí, lo haremos cuando el usuario vea la respuesta
    }
  }

  const handleSeeAnswer = () => {
    // Reducir vidas solo cuando el usuario ve la respuesta
    setLives((prev) => prev - 1)

    if (lives <= 1) {
      setGameOver(true)
    }
  }

  const handleNext = () => {
    if (currentIndex < words.length - 1 && !gameOver) {
      setCurrentIndex((prev) => prev + 1)
      setShowResult(false)
      setIsCorrect(null)
    } else {
      setGameOver(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setLives(3)
    setGameOver(false)
    setShowResult(false)
    setIsCorrect(null)

    // Shuffle words again
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    setWords(shuffled)
  }

  const handleBackToDashboard = () => {
    router.push("/")
  }

    // 音声再生
const playAudio = async (text: string, speaker: string) => {
  console.log("star playing:" + text);
  try {
    // 音声取得
    console.log("version");
        const version = await axios.get('/version');
        console.log("version:", version);
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

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  const currentWord = words[currentIndex]
  const progress = (currentIndex / words.length) * 100
  const mode = Number.parseInt(modeParam || "0")

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-background to-background/90">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={handleBackToDashboard}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <ScoreDisplay score={score} lives={lives} />
      </div>

      <ProgressBar progress={progress} />

      <div className="flex-1 flex flex-col items-center justify-center">
      <Main handlesetCharacter={setCharacter}/>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {gameOver ? (
            <div className="text-center space-y-6 p-8 bg-card rounded-lg border border-border">
              <h2 className="text-xl font-bold">Juego Terminado</h2>
              <p className="text-lg">Puntuación final: {score}</p>
              <div className="flex flex-col gap-4">
                <Button onClick={handleRestart}>Reiniciar</Button>
                <Button variant="outline" onClick={handleBackToDashboard}>
                  Volver al inicio
                </Button>
              </div>
            </div>
          ) : (
            <StudyCard
              word={currentWord}
              mode={mode}
              onAnswer={handleAnswer}
              onSeeAnswer={handleSeeAnswer}
              showResult={showResult}
              isCorrect={isCorrect}
              onNext={handleNext}
              character={character}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}
