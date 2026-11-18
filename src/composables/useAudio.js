import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import axios from 'axios'
import { useSpeech } from '@/composables/useSpeech'

// Estado compartido a nivel de módulo (igual que en el original)
const voiceVoxStatus = ref(false)
const elevanLabsStatus = ref(false)

// Decodifica base64 a Uint8Array (sustituye a Buffer.from(..., 'base64'))
function base64ToBytes(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function useAudio() {
  const isVoiceVoxSpeaking = ref(false)
  let currentAudio = null
  const audioUrls = new Set()

  const { speak, isLocalSpeaking } = useSpeech()

  const stopAllAudio = () => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }

    // Limpiar URLs de objetos creados
    audioUrls.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    audioUrls.clear()

    isVoiceVoxSpeaking.value = false
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      veryfyElevenLabsStatus()
    })
    // Limpieza al desmontar el componente
    onUnmounted(() => {
      stopAllAudio()
    })
  }

  const isSpeaking = computed(() => isVoiceVoxSpeaking.value || isLocalSpeaking.value)

  const veryfyVoiceVoxStatus = async () => {
    try {
      const { data: version } = await axios.get('/api/version')
      if (version === 'latest') voiceVoxStatus.value = true
    } catch (e) {
      console.error(e)
      voiceVoxStatus.value = false
    }
  }

  const veryfyElevenLabsStatus = async () => {
    try {
      const { data } = await axios.get('/api/tts_version')
      console.log('status:', data.ok)
      if (data.ok) elevanLabsStatus.value = true
    } catch (e) {
      console.error(e)
      elevanLabsStatus.value = false
    }
  }

  // Crea y reproduce un Audio a partir de bytes, con manejo de estado y limpieza
  const playBytes = async (byteArray, mime, errorMsg) => {
    const audioBlob = new Blob([byteArray], { type: mime })
    const audioUrl = URL.createObjectURL(audioBlob)
    audioUrls.add(audioUrl)

    const audio = new Audio(audioUrl)
    audio.volume = 1
    currentAudio = audio

    audio.onplay = () => { isVoiceVoxSpeaking.value = true }

    const cleanup = () => {
      isVoiceVoxSpeaking.value = false
      URL.revokeObjectURL(audioUrl)
      audioUrls.delete(audioUrl)
      if (currentAudio === audio) currentAudio = null
    }
    audio.onended = cleanup
    audio.onerror = () => {
      cleanup()
      console.error(errorMsg)
    }

    await audio.play()
    return audio
  }

  const playVoiceVoxAudio = async (text, speaker) => {
    // Detener cualquier audio previo
    stopAllAudio()

    try {
      const responseAudio = await axios.post('/api/audio', { text, speaker })
      // Base64
      const base64Audio = responseAudio?.data?.response
      return await playBytes(base64ToBytes(base64Audio), 'audio/x-wav', 'Error playing audio')
    } catch (error) {
      console.error('Error in playVoiceVoxAudio:', error)
      throw error
    }
  }

  const _playElevenLabsAudio = async (text, speaker) => {
    // Detener cualquier audio previo
    stopAllAudio()
    console.log('{text, speaker}', { text, speaker })

    try {
      const responseAudio = await axios.post('/api/tts', {
        text,
        voice: speaker, // opcional, si no se pasa se usa la voz por defecto en el backend
      }, {
        responseType: 'arraybuffer', // importante para recibir audio binario
      })
      console.log('responseAudio', responseAudio)

      const data = responseAudio?.data
      if (!data) throw new Error('No audio received from ElevenLabs')

      // Igual que el original: se interpreta el contenido como base64 (texto)
      const base64Audio = typeof data === 'string' ? data : new TextDecoder().decode(data)
      return await playBytes(base64ToBytes(base64Audio), 'audio/mpeg', 'Error playing ElevenLabs audio')
    } catch (error) {
      console.error('Error in playElevenLabsAudio:', error)
      throw error
    }
  }

  const playAudio = async (text, speaker) => {
    try {
      if (voiceVoxStatus.value || elevanLabsStatus.value) {
        await playVoiceVoxAudio(text, speaker)
        // await _playElevenLabsAudio(text, speaker)
      } else {
        speak(text)
      }
    } catch (e) {
      console.error('Error in playAudio:', e)
      speak(text)
    }
  }

  return { playAudio, stopAllAudio, voiceVoxStatus, elevanLabsStatus, isSpeaking, veryfyVoiceVoxStatus, veryfyElevenLabsStatus }
}
