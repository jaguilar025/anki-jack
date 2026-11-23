<script setup>
// Vista clásica de conversación (solo chat). La sección principal ahora es AvatarChatView.
import { watch, nextTick, useTemplateRef, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@lucide/vue'
import ChatInterface from '@/components/ChatInterface.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion } from 'motion-v'
import { useConversation } from '@/composables/useConversation'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const chat = useTemplateRef('chat')

const {
  messages,
  input,
  level,
  isLoading,
  conversationStarted,
  character,
  startConversation,
  sendMessage,
  stopAllAudio,
} = useConversation()

// Scroll al final cuando cambian los mensajes
watch(
  messages,
  async () => {
    await nextTick()
    chat.value?.scrollToBottom()
  },
  { deep: true },
)

const goBack = () => {
  stopAllAudio()
  router.push('/main')
}

// Detener el audio al salir
onUnmounted(() => {
  stopAllAudio()
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gradient-to-br from-background to-background/90">
    <header class="p-4 border-b flex items-center justify-between">
      <Button variant="ghost" @click="goBack">
        <ArrowLeft class="mr-2 h-4 w-4" />
        {{ t('common.back') }}
      </Button>
      <h1 class="text-lg font-bold">{{ t('study.conversation.title') }}</h1>
      <div class="w-8"></div>
      <!-- Espaciador para centrar -->
    </header>

    <div v-if="!conversationStarted" class="flex-1 flex items-center justify-center p-4">
      <motion.div
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        class="w-full max-w-md p-6 bg-card rounded-lg border border-border"
      >
        <h2 class="text-xl font-bold mb-6 text-center">{{ t('study.conversation.selectLevel') }}</h2>

        <div class="space-y-6">
          <div class="space-y-2">
            <label class="text-sm text-muted-foreground">{{ t('study.conversation.levelLabel') }}</label>
            <Select v-model="level">
              <SelectTrigger>
                <SelectValue :placeholder="t('study.conversation.selectLevel')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">{{ t('study.conversation.beginner') }}</SelectItem>
                <SelectItem value="intermediate">{{ t('study.conversation.intermediate') }}</SelectItem>
                <SelectItem value="advanced">{{ t('study.conversation.advanced') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button class="w-full" :disabled="!character" @click="startConversation">
            {{ t('study.conversation.start') }}
          </Button>
        </div>
      </motion.div>
    </div>
    <ChatInterface
      v-else
      ref="chat"
      v-model="input"
      :character="character"
      :messages="messages"
      :is-loading="isLoading"
      @send="sendMessage"
    />
  </div>
</template>
