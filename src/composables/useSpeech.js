import { ref } from 'vue'

export function useSpeech() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const isLocalSpeaking = ref(false)

  const speak = (text) => {
    if (!isSupported || !text) return

    // Detener cualquier voz en curso
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = 0.8

    utterance.onstart = () => { isLocalSpeaking.value = true }
    utterance.onend = () => { isLocalSpeaking.value = false }
    utterance.onerror = () => {
      console.error('Speech synthesis error')
      isLocalSpeaking.value = false
    }

    window.speechSynthesis.speak(utterance)
  }

  return { speak, isLocalSpeaking, isSupported }
}
