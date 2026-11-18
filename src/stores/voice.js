import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import voices from '@/data/voices.json'

/**
 * Voz/personaje VOICEVOX seleccionado en la landing (InfiniteMenu).
 * Reemplaza el uso directo de localStorage 'voiceID' en anki-jack.
 * Nota: en Next, conversation/page.tsx comparaba string === number y nunca encontraba
 * el personaje; aquí voiceID siempre es number.
 */
export const useVoiceStore = defineStore('voice', () => {
  const voiceID = useLocalStorage('voiceID', 1, {
    serializer: { read: (v) => Number(v) || 1, write: (v) => String(v) },
  })

  const character = computed(() => voices.find((v) => v.id_style_default === voiceID.value) ?? null)

  function setVoice(id) {
    voiceID.value = Number(id) || 1
  }

  return { voices, voiceID, character, setVoice }
})
