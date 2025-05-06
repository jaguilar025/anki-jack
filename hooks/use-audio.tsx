"use client"

import { useEffect, useState } from "react"

export function useAudio() {
  const [correctAudio, setCorrectAudio] = useState<HTMLAudioElement | null>(null)
  const [incorrectAudio, setIncorrectAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const correct = new Audio("/sounds/correct.wav")
      const incorrect = new Audio("/sounds/incorrect.wav")

      setCorrectAudio(correct)
      setIncorrectAudio(incorrect)
    }

    return () => {
      if (correctAudio) {
        correctAudio.pause()
      }
      if (incorrectAudio) {
        incorrectAudio.pause()
      }
    }
  }, [])

  const playCorrect = () => {
    if (correctAudio) {
      correctAudio.currentTime = 0
      correctAudio.play().catch((e) => console.error("Error playing sound:", e))
    }
  }

  const playIncorrect = () => {
    if (incorrectAudio) {
      incorrectAudio.currentTime = 0
      incorrectAudio.play().catch((e) => console.error("Error playing sound:", e))
    }
  }

  return { playCorrect, playIncorrect }
}
