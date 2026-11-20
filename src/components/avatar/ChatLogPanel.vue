<script setup>
// Historial de la conversación en un panel flotante sobre el avatar.
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { X } from '@lucide/vue'
import MessageBubble from '@/components/MessageBubble.vue'

const props = defineProps({
  messages: { type: Array, required: true },
  character: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const list = useTemplateRef('list')

function scrollToBottom(behavior = 'smooth') {
  nextTick(() => list.value?.scrollTo({ top: list.value.scrollHeight, behavior }))
}

watch(() => [props.messages.length, props.loading], () => scrollToBottom())
onMounted(() => scrollToBottom('instant'))
</script>

<template>
  <aside class="glass flex flex-col overflow-hidden rounded-3xl">
    <header class="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
      <h2 class="font-bold">会話ログ <span class="text-sm font-normal text-muted-foreground">(Historial)</span></h2>
      <button
        type="button"
        title="Cerrar"
        class="flex size-8 items-center justify-center rounded-full hover:bg-foreground/10"
        @click="emit('close')"
      >
        <X class="size-4" />
      </button>
    </header>

    <div ref="list" class="flex-1 space-y-3 overflow-y-auto p-4">
      <p v-if="!messages.length" class="py-8 text-center text-sm text-muted-foreground">
        Aún no hay mensajes
      </p>
      <MessageBubble
        v-for="(message, index) in messages"
        :key="index"
        :message="message"
        :character="character"
      />
      <div v-if="loading" class="flex gap-1.5 px-1">
        <span
          v-for="delay in [0, 200, 400]"
          :key="delay"
          class="size-2 animate-bounce rounded-full bg-primary"
          :style="{ animationDelay: `${delay}ms` }"
        />
      </div>
    </div>
  </aside>
</template>
