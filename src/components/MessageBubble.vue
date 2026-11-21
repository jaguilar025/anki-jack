<script setup>
import { computed, inject, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Volume2 } from '@lucide/vue'
import { useAudio } from '@/composables/useAudio'

/**
 * Burbuja de chat.
 * Props:
 *  - message: { role: 'user' | 'assistant', content: String, translation?: String,
 *               japanese: String, style?: String }
 *  - character: { value: String, ... } (se usa character.value como estilo por defecto de voz)
 * Sin emits. Usa useAudio() directamente para reproducir la frase japonesa,
 * salvo que un ancestro provea 'avatarSpeak' (vista del avatar): entonces la frase
 * pasa por el avatar para que mueva la boca y ponga la emoción.
 */
const props = defineProps({
  message: { type: Object, required: true },
  character: { type: Object, required: true },
})

const { playAudio, isSpeaking } = useAudio()
/** @type {((text: string, speaker: string, emotion?: string) => Promise<void>) | null} */
const avatarSpeak = inject('avatarSpeak', null)
const showTranslation = ref(true)

const isAssistant = computed(() => props.message.role === 'assistant')

async function handleSpeak() {
  const speaker = props.message.style || props.character.value
  if (avatarSpeak) await avatarSpeak(props.message.japanese, speaker, props.message.emotion)
  else await playAudio(props.message.japanese, speaker)
}
</script>

<template>
  <div :class="['flex', isAssistant ? 'justify-start' : 'justify-end']">
    <div
      :class="[
        'rounded-lg p-3 max-w-[80%]',
        isAssistant
          ? 'bg-secondary text-secondary-foreground'
          : 'bg-primary text-primary-foreground',
      ]"
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-start gap-2">
          <p class="japanese-text text-sm md:text-base">
            {{ message.japanese }}
          </p>

          <Button
            v-if="isAssistant"
            type="button"
            variant="ghost"
            size="icon"
            class="h-6 w-6 rounded-full"
            @click="handleSpeak"
          >
            <Volume2 :class="['h-3 w-3', isSpeaking ? 'text-primary animate-pulse' : '']" />
          </Button>
        </div>

        <p
          v-if="isAssistant && message.translation && showTranslation"
          class="text-xs text-muted-foreground mt-1 italic"
        >
          {{ message.translation }}
        </p>

        <Button
          v-if="isAssistant && message.translation"
          type="button"
          variant="ghost"
          size="sm"
          class="text-xs self-start -mt-1 h-6 px-2"
          @click="showTranslation = !showTranslation"
        >
          {{ showTranslation ? 'Ocultar traducción' : 'Mostrar traducción' }}
        </Button>
      </div>
    </div>
  </div>
</template>
