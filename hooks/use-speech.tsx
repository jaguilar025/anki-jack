"use client"

import { useState, useCallback, useEffect } from "react"

export function useSpeech() {
  const [isLocalSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return

      // Stop any current speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "ja-JP"
      utterance.rate = 0.8

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [isSupported],
  )

  return { speak, isLocalSpeaking, isSupported }
}
