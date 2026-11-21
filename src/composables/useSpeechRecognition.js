import { ref, onUnmounted, getCurrentInstance } from 'vue'

const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

/**
 * Dictado por voz con la Web Speech API del navegador (gratis; Chrome/Edge/Safari).
 * @param {object} options
 * @param {string} [options.lang] idioma a reconocer (por defecto japonés)
 * @param {(text: string) => void} [options.onInterim] texto parcial mientras habla
 * @param {(text: string) => void} [options.onFinal] texto final al terminar de hablar
 */
export function useSpeechRecognition({ lang = 'ja-JP', onInterim, onFinal } = {}) {
  const isSupported = Boolean(SpeechRecognition)
  const isListening = ref(false)
  const error = ref('')
  let recognition = null

  function start() {
    if (!isSupported || isListening.value) return
    error.value = ''
    let finalText = ''

    recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false // se detiene solo al dejar de hablar

    recognition.onresult = (event) => {
      let interim = ''
      finalText = ''
      for (const result of event.results) {
        if (result.isFinal) finalText += result[0].transcript
        else interim += result[0].transcript
      }
      onInterim?.(finalText + interim)
    }
    recognition.onerror = (event) => {
      // 'no-speech' y 'aborted' son normales (silencio o detenido a mano)
      if (!['no-speech', 'aborted'].includes(event.error)) error.value = event.error
    }
    recognition.onend = () => {
      isListening.value = false
      recognition = null
      if (finalText.trim()) onFinal?.(finalText.trim())
    }

    recognition.start()
    isListening.value = true
  }

  function stop() {
    recognition?.stop()
  }

  function abort() {
    recognition?.abort()
  }

  if (getCurrentInstance()) onUnmounted(abort)

  return { isSupported, isListening, error, start, stop, abort }
}
