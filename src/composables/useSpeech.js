import { ref } from 'vue'

const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// Algunos navegadores Android usan 'ja_JP' en vez de 'ja-JP'
const isJapanese = (voice) => /^ja([-_]|$)/i.test(voice.lang)

let japaneseVoice = null

// Busca una voz japonesa. En móvil las voces cargan de forma asíncrona,
// así que se reintenta cuando llega el evento voiceschanged.
function loadJapaneseVoice() {
  const voices = window.speechSynthesis.getVoices()
  const candidates = voices.filter(isJapanese)
  japaneseVoice =
    candidates.find((v) => v.localService) ?? candidates[0] ?? null
}

if (isSupported) {
  loadJapaneseVoice()
  window.speechSynthesis.addEventListener?.('voiceschanged', loadJapaneseVoice)
}

export function useSpeech() {
  const isLocalSpeaking = ref(false)

  const speak = (text) => {
    if (!isSupported || !text) return

    // Detener cualquier voz en curso
    window.speechSynthesis.cancel()

    if (!japaneseVoice) loadJapaneseVoice()

    const utterance = new SpeechSynthesisUtterance(text)
    // Sin una voz explícita, algunos navegadores (p. ej. en móviles chinos)
    // ignoran lang y usan la voz por defecto del sistema
    if (japaneseVoice) utterance.voice = japaneseVoice
    else console.warn('No hay voz japonesa instalada en este dispositivo')
    utterance.lang = japaneseVoice?.lang ?? 'ja-JP'
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
