import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import axios from 'axios'
import { useSpeech } from '@/composables/useSpeech'
import { getCachedAudio, putCachedAudio } from '@/lib/audioCache'

// Voz y estilo de OpenAI TTS (deben existir en server/routes/openai-tts.js).
// Forman parte de la clave del caché: si cambian, se generan audios nuevos.
const OPENAI_TTS_VOICE = 'marin'
const OPENAI_TTS_STYLE = 'pirate-v1'

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

  // Respaldo con voz japonesa generada en el servidor (OpenAI TTS).
  // Primero busca el audio en el caché del navegador; si no está, lo genera y lo guarda.
  const playOpenAIAudio = async (text) => {
    stopAllAudio()
    const key = { provider: 'openai', voice: OPENAI_TTS_VOICE, style: OPENAI_TTS_STYLE, text }

    let data = await getCachedAudio(key)
    if (!data) {
      const response = await axios.post(
        '/api/openai-tts',
        { text, voice: OPENAI_TTS_VOICE, style: OPENAI_TTS_STYLE },
        { responseType: 'arraybuffer' },
      )
      data = response.data
      await putCachedAudio(key, data)
    }
    return await playBytes(new Uint8Array(data), 'audio/mpeg', 'Error playing OpenAI audio')
  }

  // Orden: VoiceVox → OpenAI TTS → voz del navegador
  const playAudio = async (text, speaker) => {
    if (voiceVoxStatus.value || elevanLabsStatus.value) {
      try {
        await playVoiceVoxAudio(text, speaker)
        // await _playElevenLabsAudio(text, speaker)
        return
      } catch (e) {
        console.error('Error in playAudio (VoiceVox):', e)
      }
    }
    try {
      await playOpenAIAudio(text)
    } catch (e) {
      console.error('Error in playAudio (OpenAI TTS):', e)
      speak(text)
    }
  }

  return { playAudio, stopAllAudio, voiceVoxStatus, elevanLabsStatus, isSpeaking, veryfyVoiceVoxStatus, veryfyElevenLabsStatus }
}
