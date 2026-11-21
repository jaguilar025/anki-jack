<script setup>
// Barra de entrada flotante tipo "cápsula": texto + micrófono + enviar + detener.
//  - v-model: texto del mensaje
//  - props: loading (esperando respuesta), speaking (el avatar está hablando)
//  - emits: send, stop (corta el audio y el micrófono)
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { Loader2, Mic, Send, Square } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const props = defineProps({
  loading: { type: Boolean, default: false },
  speaking: { type: Boolean, default: false },
})
const text = defineModel({ type: String, default: '' })
const emit = defineEmits(['send', 'stop'])

const textarea = useTemplateRef('textarea')

const mic = useSpeechRecognition({
  lang: 'ja-JP',
  onInterim: (t) => (text.value = t),
  // Al terminar de hablar se envía solo
  onFinal: (t) => {
    text.value = t
    emit('send')
  },
})

watch(mic.error, (e) => {
  if (e === 'not-allowed') toast.error('Permite el acceso al micrófono para usar el dictado')
  else if (e) toast.error(`Error del micrófono: ${e}`)
})

const canSend = computed(() => !props.loading && text.value.trim().length > 0)

const placeholder = computed(() => {
  if (props.loading) return 'Generando respuesta…'
  if (mic.isListening.value) return 'Escuchando…'
  return 'Escribe un mensaje…'
})

// Crece con el texto hasta ~5 líneas
function autoResize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 132)}px`
}
watch(text, () => nextTick(autoResize))

function send() {
  if (canSend.value) emit('send')
}

function onKeydown(event) {
  // isComposing: Enter que confirma la conversión del IME japonés no debe enviar
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

function toggleMic() {
  if (mic.isListening.value) mic.stop()
  else mic.start()
}

function stop() {
  mic.abort()
  emit('stop')
}
</script>

<template>
  <div class="glass flex items-end gap-1.5 rounded-[28px] p-2 pl-4 sm:gap-2">
    <textarea
      ref="textarea"
      v-model="text"
      rows="1"
      :placeholder="placeholder"
      :disabled="loading"
      class="flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
      @keydown="onKeydown"
    />

    <button
      v-if="mic.isSupported"
      type="button"
      :title="mic.isListening.value ? 'Detener dictado' : 'Hablar (japonés)'"
      :disabled="loading || speaking"
      :class="[
        'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 sm:size-11',
        mic.isListening.value
          ? 'bg-rose-500 text-white animate-[mic-pulse_1.5s_ease-out_infinite]'
          : 'bg-foreground/10 hover:bg-foreground/20',
      ]"
      @click="toggleMic"
    >
      <Mic class="size-5" />
    </button>

    <button
      type="button"
      title="Enviar"
      :disabled="!canSend"
      class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none sm:size-11"
      @click="send"
    >
      <Loader2 v-if="loading" class="size-5 animate-spin" />
      <Send v-else class="size-5" />
    </button>

    <button
      type="button"
      title="Detener"
      class="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 transition-colors hover:bg-foreground/20 sm:size-11"
      @click="stop"
    >
      <Square class="size-4 fill-current" />
    </button>
  </div>
</template>
