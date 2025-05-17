"use client"

import { useState, useCallback } from "react"

export function useSpeech() {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window
  const [isLocalSpeaking, setIsSpeaking] = useState(false)

  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return

    // Stop any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "ja-JP"
    utterance.rate = 0.8

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => {
      console.error("Speech synthesis error")
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }, [isSupported])

  return { speak, isLocalSpeaking, isSupported }
}
