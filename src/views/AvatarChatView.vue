<script setup>
// Conversación con avatar 3D a pantalla completa.
// Arriba a la izquierda: volver, historial (panel flotante) y ajustes (fondo).
// Abajo: subtítulo con la última respuesta + barra de entrada (texto, micrófono, enviar, detener).
import { computed, defineAsyncComponent, nextTick, onUnmounted, provide, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { findChatCommand } from '@/data/chatCommands'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessagesSquare,
  PersonStanding,
  Settings,
  Video,
  Volume1,
  Volume2,
  VolumeX,
} from '@lucide/vue'
import { onClickOutside, useLocalStorage } from '@vueuse/core'
import { motion, AnimatePresence } from 'motion-v'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import LessonCarousel from '@/components/conversation/LessonCarousel.vue'
import GrammarTopics from '@/components/conversation/GrammarTopics.vue'
import AvatarStage from '@/components/avatar/AvatarStage.vue'
// Live2D (pixi + Cubism) solo se descarga si eliges un avatar Live2D
const Live2DStage = defineAsyncComponent(() => import('@/components/avatar/Live2DStage.vue'))
import ChatInputBar from '@/components/avatar/ChatInputBar.vue'
import ChatLogPanel from '@/components/avatar/ChatLogPanel.vue'
import AvatarSettingsDialog from '@/components/avatar/AvatarSettingsDialog.vue'
import YoutubeBackground from '@/components/avatar/YoutubeBackground.vue'
import LocalVideoBackground from '@/components/avatar/LocalVideoBackground.vue'
import MotionDrawer from '@/components/avatar/MotionDrawer.vue'
import { useConversation } from '@/composables/useConversation'
import { useAvatarSettingsStore, parseYoutubeId } from '@/stores/avatarSettings'

const router = useRouter()
const { t } = useI18n()
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

// --- Cambio de lección durante la conversación (reinicia el chat) ---
const showLessonPicker = ref(false)
const pendingLesson = ref(1)

function openLessonPicker() {
  pendingLesson.value = lesson.value
  showLessonPicker.value = true
}

function confirmLessonChange() {
  showLessonPicker.value = false
  if (pendingLesson.value === lesson.value) return
  lesson.value = pendingLesson.value
  restartConversation()
}

// Progreso de la descarga del avatar elegido (null si no está descargando)
const avatarDownload = computed(() => settings.downloads[settings.selectedAvatar.id] ?? null)

const {
  messages,
  input,
  lesson,
  lessonData,
  focus,
  isLoading,
  isSpeaking,
  conversationStarted,
  character,
  startConversation,
  restartConversation,
  sendMessage,
  toggleFocus,
  explainGrammar,
  stopAllAudio,
  speak,
} = useConversation({
  // Cada audio de la respuesta pasa por el avatar para mover la boca
  onAudio: (audio) => stage.value?.attachAudio(audio),
  // Emoción que eligió la IA para la respuesta → cara del avatar
  onEmotion: (emotion, opts) => stage.value?.setEmotion(emotion, opts),
  onCommand: runChatCommand,
})

// --- Comandos del chat (src/data/chatCommands.js): se ejecutan en vez de ir a la IA ---
const FORMAT_LABELS = { vrm: 'VRM', live2d: 'Live2D' }

/**
 * Video de fondo temporal de un comando (encima del fondo guardado, que no se toca):
 * YouTube { id, volume, muted, vertical } o local { local: true, src, volume, muted }.
 * Al quitarlo vuelve a verse el fondo de siempre.
 */
const tempVideo = ref(null)
const localVideo = ref(null)

// Video que se ve de fondo: el temporal del comando o el guardado en Ajustes
const activeVideo = computed(() => {
  if (tempVideo.value?.local) return null // lo tapa el video local
  if (tempVideo.value) return { ...tempVideo.value, temp: true }
  if (!settings.backgroundVideoId) return null
  return { id: settings.backgroundVideoId, muted: settings.videoMuted, volume: videoVolume.value, vertical: false }
})
let resolveVideoPlaying = null
let commandRun = 0
/** Hay un comando en curso (p. ej. el baile): se oculta el subtítulo para no tapar al avatar */
const commandActive = ref(false)

/** Espera a que el video temporal empiece a sonar (o se rinde a los `ms`) */
function waitVideoPlaying(ms) {
  return new Promise((resolve) => {
    resolveVideoPlaying = resolve
    setTimeout(resolve, ms)
  })
}

function onVideoPlaying() {
  resolveVideoPlaying?.()
  resolveVideoPlaying = null
}

/** Espera a que el <video> pueda reproducirse sin cortes (o se rinde a los `ms`) */
function waitCanPlay(video, ms) {
  if (video.readyState >= 4) return Promise.resolve()
  return new Promise((resolve) => {
    video.addEventListener('canplaythrough', resolve, { once: true })
    setTimeout(resolve, ms)
  })
}

/**
 * Video local + animación: el baile sigue el reloj del video (si el video se atasca, el baile
 * espera) y todo termina cuando acaba lo primero de los dos.
 */
async function playWithLocalVideo(command, bg, run) {
  tempVideo.value = { local: true, src: bg.video, volume: bg.volume ?? 100, muted: bg.muted ?? false }
  await nextTick()
  const video = localVideo.value?.videoEl
  if (!video) return
  await waitCanPlay(video, 8000)
  if (run !== commandRun) return
  video.currentTime = 0
  // Con sonido requiere que el usuario haya interactuado (el Enter del comando cuenta);
  // si el navegador lo bloquea, sigue sin sonido
  await video.play().catch(() => {
    video.muted = true
    return video.play()
  })
  const offset = bg.offset ?? 0
  const ended = new Promise((resolve) => video.addEventListener('ended', () => resolve('ended'), { once: true }))
  const result = await Promise.race([
    stage.value?.playAnimation?.(command.action.url, { clock: () => video.currentTime + offset }),
    ended,
  ])
  // El video (la música) siempre suena completo: si el baile acabó antes, se espera al video;
  // si el video acabó antes, se corta el baile
  if (result === 'ended') stage.value?.stopAnimation?.()
  else await ended
}


async function runCommandAction(command) {
  const run = ++commandRun
  commandActive.value = true
  try {
    const bg = command.background
    if (bg?.video && command.action.type === 'animation') {
      await playWithLocalVideo(command, bg, run)
      return
    }
    // Fondo temporal de YouTube: el baile arranca cuando el video empieza
    const id = bg?.youtube && parseYoutubeId(bg.youtube)
    if (id) {
      tempVideo.value = {
        id,
        volume: bg.volume ?? 100,
        muted: bg.muted ?? false,
        vertical: bg.youtube.includes('/shorts/'),
      }
      await waitVideoPlaying(5000)
      if (run !== commandRun) return
    }
    if (command.action.type === 'animation') await stage.value?.playAnimation?.(command.action.url)
  } catch (error) {
    console.error('[AvatarChatView] Error al reproducir el comando:', error)
    toast.error(t('avatar.commands.failed'))
  } finally {
    // Al terminar (o interrumpirse) vuelve el fondo de antes, salvo que ya corra otro comando
    if (run === commandRun) {
      tempVideo.value = null
      commandActive.value = false
    }
  }
}

/** Devuelve true si el texto era un comando (y lo ejecuta) */
function runChatCommand(text) {
  const command = findChatCommand(text)
  if (!command) return false
  if (!command.formats.includes(avatarData.value?.format)) {
    const format = command.formats.map((f) => FORMAT_LABELS[f]).join(' / ')
    toast.info(t('avatar.commands.needsFormat', { format }))
    return true
  }
  runCommandAction(command)
  return true
}

// --- Easter egg: más de 10 toques rápidos (menos de 1 s entre uno y otro) → "やめてください！" ---
const TAPS_TO_COMPLAIN = 10
const TAP_RESET_MS = 1000
let tapCount = 0
let tapTimer = null

function onAvatarTap() {
  clearTimeout(tapTimer)
  tapCount++
  tapTimer = setTimeout(() => (tapCount = 0), TAP_RESET_MS)
  if (tapCount <= TAPS_TO_COMPLAIN) return
  tapCount = 0
  clearTimeout(tapTimer)
  if (isSpeaking.value) return
  // Con el estilo de voz enojado del personaje si tiene uno (怒り, おこ, ツンギレ…)
  const styles = character.value.styles ?? []
  const angry = styles.find((s) => /怒|おこ|ツンギレ|不機嫌|ツンツン/.test(s.name))
  speak('やめてください！', String(angry?.id ?? character.value.value), 'angry')
}

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
// Contraído: máximo 2 líneas con scroll (para que una respuesta larga no tape al avatar en móvil)
const subtitleCollapsed = useLocalStorage('avatar-subtitle-collapsed', false)

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
  <div class="relative h-dvh w-full overflow-hidden transition-[background] duration-500" :style="tempVideo ? { background: '#000' } : settings.backgroundStyle">
    <!-- Video de fondo (YouTube) -->
    <YoutubeBackground
      v-if="activeVideo"
      :key="`${activeVideo.id}${activeVideo.temp ? '-temp' : ''}`"
      :video-id="activeVideo.id"
      :muted="activeVideo.muted"
      :volume="activeVideo.volume"
      :vertical="activeVideo.vertical"
      @quality="videoQuality = $event"
      @playing="onVideoPlaying"
    />

    <!-- Video local temporal de un comando (p. ej. el baile) -->
    <LocalVideoBackground
      v-if="tempVideo?.local"
      ref="localVideo"
      :src="tempVideo.src"
      :volume="tempVideo.volume"
      :muted="tempVideo.muted"
    />

    <!-- Avatar a pantalla completa -->
    <div class="absolute inset-0">
      <AvatarStage
        v-if="avatarData?.format === 'vrm'"
        ref="stage"
        :model-url="avatarData.url"
        :lighting="settings.vrmLighting"
        @tap="onAvatarTap"
      />
      <Live2DStage
        v-else-if="avatarData?.format === 'live2d'"
        ref="stage"
        :source="avatarData.blob"
        :look="settings.live2dLook"
        @tap="onAvatarTap"
      />
    </div>

    <!-- Descarga / error del avatar -->
    <div
      v-if="avatarDownload !== null || avatarError"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div class="glass w-64 rounded-2xl p-4 text-center text-sm">
        <template v-if="avatarDownload !== null">
          <p class="mb-2 font-medium">{{ t('avatar.view.downloading') }}</p>
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
      <button type="button" :title="t('avatar.nav.back')" :class="dockButton" @click="goBack">
        <ArrowLeft class="size-5" />
      </button>
      <button
        type="button"
        :title="t('avatar.nav.history')"
        :class="[dockButton, showLog && 'bg-foreground/15']"
        @click="showLog = !showLog"
      >
        <MessagesSquare class="size-5" />
      </button>
      <button
        type="button"
        :title="t('avatar.nav.motions')"
        :class="[dockButton, showMotions && 'bg-foreground/15']"
        @click="showMotions = !showMotions"
      >
        <PersonStanding class="size-5" />
      </button>
      <button type="button" :title="t('avatar.nav.settings')" :class="dockButton" @click="showSettings = true">
        <Settings class="size-5" />
      </button>

      <!-- Sonido del video de fondo (solo si el fondo es un video) -->
      <div v-if="settings.backgroundVideoId" ref="videoMenu" class="relative">
        <button
          type="button"
          :title="t('avatar.nav.video')"
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
              :title="settings.videoMuted ? t('avatar.view.unmute') : t('avatar.view.mute')"
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
              :title="t('avatar.view.volume')"
              class="flex-1 accent-primary"
              :disabled="settings.videoMuted"
            />
            <span class="w-8 text-right text-xs tabular-nums text-muted-foreground">
              {{ settings.videoMuted ? '—' : settings.videoVolume }}
            </span>
          </div>

          <label class="flex cursor-pointer items-center gap-2 text-xs">
            <input v-model="settings.videoDuck" type="checkbox" class="accent-primary" />
            {{ t('avatar.view.duck') }}
          </label>

          <p class="text-xs text-muted-foreground">
            {{ t('avatar.view.quality', { quality: videoQuality || '…' }) }}
            <span class="block">{{ t('avatar.view.qualityNote') }}</span>
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
        class="absolute inset-x-3 bottom-36 z-20 max-h-[21dvh] sm:inset-x-auto sm:bottom-28 sm:right-6 sm:top-24 sm:max-h-none sm:w-80"
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
        v-if="lastAssistant && conversationStarted && !showLog && !commandActive"
        :class="showMotions && 'max-sm:hidden'"
        :key="messages.length"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        class="pointer-events-auto relative w-full max-w-xl rounded-lg bg-background/80 py-3 pl-8 pr-8 text-center shadow backdrop-blur"
      >
        <div :class="['overflow-y-auto', subtitleCollapsed ? 'max-h-12' : 'max-h-[45dvh]']">
          <p class="text-base leading-6">{{ lastAssistant.japanese || lastAssistant.content }}</p>
          <p v-if="lastAssistant.translation" class="mt-1 text-sm text-muted-foreground">
            {{ lastAssistant.translation }}
          </p>
        </div>
        <button
          type="button"
          :title="subtitleCollapsed ? t('avatar.subtitle.expand') : t('avatar.subtitle.collapse')"
          class="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          @click="subtitleCollapsed = !subtitleCollapsed"
        >
          <ChevronUp v-if="subtitleCollapsed" class="size-4" />
          <ChevronDown v-else class="size-4" />
        </button>
      </motion.div>

      <!-- Antes de empezar: elegir lección (初中級 1–15) -->
      <motion.div
        v-if="!conversationStarted"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        class="glass pointer-events-auto w-full max-w-md space-y-4 rounded-3xl p-5"
      >
        <h2 class="text-center text-lg font-bold">{{ t('conversation.chooseLesson') }}</h2>
        <LessonCarousel v-model="lesson" />
        <p class="japanese-text text-center text-xs text-muted-foreground">{{ lessonData.goal }}</p>
        <Button class="w-full" :disabled="!character" @click="startConversation">{{ t('conversation.start') }}</Button>
      </motion.div>

      <!-- Conversación: gramática de la lección + entrada -->
      <div v-else class="pointer-events-auto w-full max-w-[680px]">
        <GrammarTopics
          :lesson="lessonData"
          :focus="focus"
          :disabled="isLoading"
          @toggle="toggleFocus"
          @explain="explainGrammar"
          @change-lesson="openLessonPicker"
        />
        <ChatInputBar
          v-model="input"
          class="mt-2"
          :loading="isLoading"
          :speaking="isSpeaking"
          @send="sendMessage"
          @stop="stopAllAudio"
        />
      </div>
    </div>

    <!-- Cambiar de lección (reinicia la conversación) -->
    <Dialog v-model:open="showLessonPicker">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('conversation.changeLesson') }}</DialogTitle>
          <DialogDescription>{{ t('conversation.confirmChange') }}</DialogDescription>
        </DialogHeader>
        <LessonCarousel v-model="pendingLesson" />
        <DialogFooter>
          <Button variant="outline" @click="showLessonPicker = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="pendingLesson === lesson" @click="confirmLessonChange">
            {{ t('conversation.changeLesson') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AvatarSettingsDialog v-model:open="showSettings" />
  </div>
</template>
