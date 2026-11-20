<script setup>
// Conversación con avatar 3D a pantalla completa.
// Arriba a la izquierda: volver, historial (panel flotante) y ajustes (fondo).
// Abajo: subtítulo con la última respuesta + barra de entrada (texto, micrófono, enviar, detener).
import { computed, defineAsyncComponent, onUnmounted, provide, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, MessagesSquare, PersonStanding, Settings, Video, Volume1, Volume2, VolumeX } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'
import { motion, AnimatePresence } from 'motion-v'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AvatarStage from '@/components/avatar/AvatarStage.vue'
// Live2D (pixi + Cubism) solo se descarga si eliges un avatar Live2D
const Live2DStage = defineAsyncComponent(() => import('@/components/avatar/Live2DStage.vue'))
import ChatInputBar from '@/components/avatar/ChatInputBar.vue'
import ChatLogPanel from '@/components/avatar/ChatLogPanel.vue'
import AvatarSettingsDialog from '@/components/avatar/AvatarSettingsDialog.vue'
import YoutubeBackground from '@/components/avatar/YoutubeBackground.vue'
import MotionDrawer from '@/components/avatar/MotionDrawer.vue'
import { useConversation } from '@/composables/useConversation'
import { useAvatarSettingsStore } from '@/stores/avatarSettings'

const router = useRouter()
const stage = ref(null)
const settings = useAvatarSettingsStore()
const showLog = ref(false)
const showSettings = ref(false)

// --- Menú de movimientos (panel lateral) ---
const showMotions = ref(false)
const modelMotions = computed(() => stage.value?.modelMotions ?? [])

async function playMotion(item) {
  const s = stage.value
  if (!s) return
  if (item.kind === 'gesture') s.playGesture(item.name)
  else if (item.kind === 'emotion') s.setEmotion(item.name)
  else if (item.kind === 'vrma') {
    const url = await settings.getAnimationUrl(item.id)
    if (url) s.playAnimation?.(url)
  } else s.playModelMotion?.(item)
}

// --- Sonido del video de fondo ---
const showVideoPanel = ref(false)
const videoMenu = ref(null)
const videoQuality = ref('')
onClickOutside(videoMenu, () => (showVideoPanel.value = false))
watch(() => settings.backgroundVideoId, () => (videoQuality.value = ''))

// --- Avatar elegido en Ajustes: { format: 'vrm', url } | { format: 'live2d', blob } ---
const avatarData = shallowRef(null)
const avatarError = ref('')
let objectUrl = null

watch(
  () => settings.selectedAvatar,
  async (avatar) => {
    avatarError.value = ''
    try {
      const data = await settings.loadAvatar(avatar)
      if (avatar !== settings.selectedAvatar) return // se eligió otro mientras descargaba
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = null
      if (data.format === 'vrm' && data.blob) {
        objectUrl = URL.createObjectURL(data.blob)
        avatarData.value = { format: 'vrm', url: objectUrl }
      } else {
        avatarData.value = data
      }
    } catch (error) {
      console.error('[AvatarChatView] Error al cargar el avatar:', error)
      if (avatar === settings.selectedAvatar) avatarError.value = error.message
    }
  },
  { immediate: true },
)

// Ajustes muestra la configuración de ambiente del tipo de avatar que se ve ahora
watch(avatarData, (data) => (settings.loadedFormat = data?.format ?? null))

// Progreso de la descarga del avatar elegido (null si no está descargando)
const avatarDownload = computed(() => settings.downloads[settings.selectedAvatar.id] ?? null)

const {
  messages,
  input,
  level,
  isLoading,
  isSpeaking,
  conversationStarted,
  character,
  startConversation,
  sendMessage,
  stopAllAudio,
  speak,
} = useConversation({
  // Cada audio de la respuesta pasa por el avatar para mover la boca
  onAudio: (audio) => stage.value?.attachAudio(audio),
  // Emoción que eligió la IA para la respuesta → cara del avatar
  onEmotion: (emotion, opts) => stage.value?.setEmotion(emotion, opts),
})

// El botón 🔊 de los mensajes del historial también habla a través del avatar
provide('avatarSpeak', speak)

// Mientras habla el avatar, el video baja a un 20 % de su volumen
const videoVolume = computed(() =>
  settings.videoDuck && isSpeaking.value ? Math.round(settings.videoVolume * 0.2) : settings.videoVolume,
)

// Subtítulo: último mensaje del avatar
const lastAssistant = computed(() =>
  [...messages.value].reverse().find((m) => m.role === 'assistant'),
)

const goBack = () => {
  stopAllAudio()
  router.push('/main')
}

onUnmounted(() => {
  stopAllAudio()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})

const dockButton =
  'flex size-10 items-center justify-center rounded-[13px] transition-colors hover:bg-foreground/10'
</script>

<template>
  <div class="relative h-dvh w-full overflow-hidden transition-[background] duration-500" :style="settings.backgroundStyle">
    <!-- Video de fondo (YouTube) -->
    <YoutubeBackground
      v-if="settings.backgroundVideoId"
      :key="settings.backgroundVideoId"
      :video-id="settings.backgroundVideoId"
      :muted="settings.videoMuted"
      :volume="videoVolume"
      @quality="videoQuality = $event"
    />

    <!-- Avatar a pantalla completa -->
    <div class="absolute inset-0">
      <AvatarStage
        v-if="avatarData?.format === 'vrm'"
        ref="stage"
        :model-url="avatarData.url"
        :lighting="settings.vrmLighting"
      />
      <Live2DStage
        v-else-if="avatarData?.format === 'live2d'"
        ref="stage"
        :source="avatarData.blob"
        :look="settings.live2dLook"
      />
    </div>

    <!-- Descarga / error del avatar -->
    <div
      v-if="avatarDownload !== null || avatarError"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div class="glass w-64 rounded-2xl p-4 text-center text-sm">
        <template v-if="avatarDownload !== null">
          <p class="mb-2 font-medium">Descargando avatar…</p>
          <div class="h-2 overflow-hidden rounded-full bg-foreground/10">
            <div
              class="h-full rounded-full bg-primary transition-[width]"
              :style="{ width: avatarDownload < 0 ? '100%' : `${Math.round(avatarDownload * 100)}%` }"
            />
          </div>
          <p v-if="avatarDownload >= 0" class="mt-1 text-xs text-muted-foreground">
            {{ Math.round(avatarDownload * 100) }}%
          </p>
        </template>
        <p v-else class="text-destructive">{{ avatarError }}</p>
      </div>
    </div>

    <!-- Menú superior -->
    <nav class="glass absolute left-3 top-3 z-20 flex gap-0.5 rounded-[18px] p-1.5 sm:left-6 sm:top-6">
      <button type="button" title="Volver" :class="dockButton" @click="goBack">
        <ArrowLeft class="size-5" />
      </button>
      <button
        type="button"
        title="Historial"
        :class="[dockButton, showLog && 'bg-foreground/15']"
        @click="showLog = !showLog"
      >
        <MessagesSquare class="size-5" />
      </button>
      <button
        type="button"
        title="Movimientos"
        :class="[dockButton, showMotions && 'bg-foreground/15']"
        @click="showMotions = !showMotions"
      >
        <PersonStanding class="size-5" />
      </button>
      <button type="button" title="Ajustes" :class="dockButton" @click="showSettings = true">
        <Settings class="size-5" />
      </button>

      <!-- Sonido del video de fondo (solo si el fondo es un video) -->
      <div v-if="settings.backgroundVideoId" ref="videoMenu" class="relative">
        <button
          type="button"
          title="Video de fondo"
          :class="[dockButton, showVideoPanel && 'bg-foreground/15']"
          @click="showVideoPanel = !showVideoPanel"
        >
          <Video class="size-5" />
        </button>

        <div
          v-if="showVideoPanel"
          class="glass absolute left-0 top-full mt-3 w-64 space-y-3 rounded-2xl p-3 text-sm"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              :title="settings.videoMuted ? 'Activar sonido' : 'Silenciar'"
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20"
              @click="settings.videoMuted = !settings.videoMuted"
            >
              <VolumeX v-if="settings.videoMuted || settings.videoVolume === 0" class="size-5" />
              <Volume1 v-else-if="settings.videoVolume < 50" class="size-5" />
              <Volume2 v-else class="size-5" />
            </button>
            <input
              v-model.number="settings.videoVolume"
              type="range"
              min="0"
              max="100"
              step="1"
              title="Volumen"
              class="flex-1 accent-primary"
              :disabled="settings.videoMuted"
            />
            <span class="w-8 text-right text-xs tabular-nums text-muted-foreground">
              {{ settings.videoMuted ? '—' : settings.videoVolume }}
            </span>
          </div>

          <label class="flex cursor-pointer items-center gap-2 text-xs">
            <input v-model="settings.videoDuck" type="checkbox" class="accent-primary" />
            Bajar el video cuando habla el avatar
          </label>

          <p class="text-xs text-muted-foreground">
            Calidad: {{ videoQuality || '…' }}
            <span class="block">YouTube la ajusta sola según el tamaño y tu conexión.</span>
          </p>
        </div>
      </div>
    </nav>

    <!-- Historial flotante -->
    <AnimatePresence>
      <motion.div
        v-if="showLog"
        :initial="{ opacity: 0, x: -24 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: -24 }"
        class="absolute inset-x-3 top-20 bottom-28 z-20 sm:inset-x-auto sm:left-6 sm:top-24 sm:w-[400px]"
      >
        <ChatLogPanel
          class="h-full"
          :messages="messages"
          :character="character"
          :loading="isLoading"
          @close="showLog = false"
        />
      </motion.div>
    </AnimatePresence>

    <!-- Movimientos: panel lateral derecho (abajo en móvil), sin tapar al avatar -->
    <AnimatePresence>
      <motion.div
        v-if="showMotions && avatarData"
        :initial="{ opacity: 0, x: 24 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: 24 }"
        class="absolute inset-x-3 bottom-28 z-20 max-h-[42dvh] sm:inset-x-auto sm:bottom-28 sm:right-6 sm:top-24 sm:max-h-none sm:w-80"
      >
        <MotionDrawer
          class="h-full max-h-[inherit]"
          :format="avatarData.format"
          :model-motions="modelMotions"
          @play="playMotion"
          @close="showMotions = false"
        />
      </motion.div>
    </AnimatePresence>

    <!-- Parte inferior: subtítulo + entrada -->
    <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-3 pb-3 sm:pb-6">
      <motion.div
        v-if="lastAssistant && conversationStarted && !showLog"
        :class="showMotions && 'max-sm:hidden'"
        :key="messages.length"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        class="pointer-events-auto w-full max-w-xl rounded-lg bg-background/80 px-4 py-3 text-center shadow backdrop-blur"
      >
        <p class="text-base">{{ lastAssistant.japanese || lastAssistant.content }}</p>
        <p v-if="lastAssistant.translation" class="mt-1 text-sm text-muted-foreground">
          {{ lastAssistant.translation }}
        </p>
      </motion.div>

      <!-- Antes de empezar: elegir nivel -->
      <motion.div
        v-if="!conversationStarted"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        class="glass pointer-events-auto w-full max-w-md rounded-3xl p-6"
      >
        <h2 class="mb-4 text-center text-xl font-bold">Selecciona tu nivel</h2>
        <div class="flex gap-2">
          <Select v-model="level">
            <SelectTrigger class="flex-1">
              <SelectValue placeholder="Selecciona tu nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Principiante</SelectItem>
              <SelectItem value="intermediate">Intermedio</SelectItem>
              <SelectItem value="advanced">Avanzado</SelectItem>
            </SelectContent>
          </Select>
          <Button :disabled="!character" @click="startConversation">Iniciar</Button>
        </div>
      </motion.div>

      <ChatInputBar
        v-else
        v-model="input"
        class="pointer-events-auto w-full max-w-[680px]"
        :loading="isLoading"
        :speaking="isSpeaking"
        @send="sendMessage"
        @stop="stopAllAudio"
      />
    </div>

    <AvatarSettingsDialog v-model:open="showSettings" />
  </div>
</template>
