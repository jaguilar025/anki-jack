<script setup>
// Contrato:
//  - props: messages ({ role: 'user'|'assistant', content, translation? }[]),
//           isLoading (boolean), character (objeto de personaje voicevox)
//  - v-model: texto del input (string)  [antes input + setInput]
//  - emits: send  [antes sendMessage(e); el submit ya hace preventDefault]
//  - expose: messagesEnd (ref al div final) y scrollToBottom()  [antes prop messagesEndRef]
import { useTemplateRef } from 'vue'
import { Send } from '@lucide/vue'
import { motion } from 'motion-v'
import MessageBubble from '@/components/MessageBubble.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from 'vue-i18n'

defineProps({
  messages: { type: Array, required: true },
  isLoading: { type: Boolean, default: false },
  character: { type: Object, required: true },
})
const { t } = useI18n()
const input = defineModel({ type: String, default: '' })
const emit = defineEmits(['send'])

const messagesEnd = useTemplateRef('messagesEnd')

const scrollToBottom = (options = { behavior: 'smooth' }) => {
  messagesEnd.value?.scrollIntoView(options)
}

defineExpose({ messagesEnd, scrollToBottom })
</script>

<template>
  <div class="flex-1 flex flex-col h-full">
    <div class="flex-1 overflow-y-auto p-4 z-10">
      <div class="max-w-3xl mx-auto space-y-4">
        <motion.div
          v-for="(message, index) in messages"
          :key="index"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.3 }"
        >
          <MessageBubble :character="character" :message="message" />
        </motion.div>

        <div v-if="isLoading" class="flex justify-start">
          <div class="bg-secondary text-secondary-foreground rounded-lg p-3 max-w-[80%]">
            <div class="flex space-x-2">
              <div class="w-2 h-2 rounded-full bg-primary animate-bounce" :style="{ animationDelay: '0ms' }"></div>
              <div class="w-2 h-2 rounded-full bg-primary animate-bounce" :style="{ animationDelay: '300ms' }"></div>
              <div class="w-2 h-2 rounded-full bg-primary animate-bounce" :style="{ animationDelay: '600ms' }"></div>
            </div>
          </div>
        </div>

        <div ref="messagesEnd" />
      </div>
    </div>

    <div class="p-4 border-t bg-background">
      <form class="max-w-3xl mx-auto flex gap-2" @submit.prevent="emit('send')">
        <Input v-model="input" :placeholder="t('study.chat.placeholder')" class="flex-1" :disabled="isLoading" />
        <Button type="submit" size="icon" :aria-label="t('study.chat.send')" :disabled="isLoading || !input.trim()">
          <Send class="h-4 w-4" />
        </Button>
      </form>
    </div>
  </div>
</template>
