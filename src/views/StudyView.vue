<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StudyCard from '@/components/StudyCard.vue'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@lucide/vue'
import { motion } from 'motion-v'
import { Characters } from '@/data/voicevox-characters'
import { useAudio } from '@/composables/useAudio'
import { useCategoriesStore } from '@/stores/categories'
import { useVoiceStore } from '@/stores/voice'
import { moveFocus, focusFirst } from '@/lib/focusNav'

// Construye la configuración de práctica desde los parámetros de la URL.
// Admite el formato nuevo (show/answer) y hace fallback al antiguo `mode`.
function parseStudyConfig(showParam, answerParam, legacyMode) {
  if (showParam !== null || answerParam !== null) {
    const valid = ['audio', 'japanese', 'english']
    const show = showParam?.split(',').filter((s) => valid.includes(s)) ?? []
    const answer = answerParam === 'japanese' ? 'japanese' : 'english'
    return { show, answer }
  }

  switch (legacyMode) {
    case '0':
      return { show: ['audio'], answer: 'japanese' }
    case '1':
      return { show: ['japanese', 'audio'], answer: 'japanese' }
    case '2':
      return { show: ['english'], answer: 'japanese' }
    case '3':
      return { show: ['japanese', 'audio'], answer: 'english' }
    default:
      return { show: [], answer: 'english' }
  }
}

const route = useRoute()
const router = useRouter()
const categoriesStore = useCategoriesStore()
const voiceStore = useVoiceStore()

// Los query params pueden ser string, array o undefined: se normalizan a string | null
const getParam = (key) => {
  const v = route.query[key]
  const s = Array.isArray(v) ? v[0] : v
  return s ?? null
}

const categoryParam = computed(() => getParam('category'))
const config = computed(() => parseStudyConfig(getParam('show'), getParam('answer'), getParam('mode')))

// Duración del temporizador por pregunta (segundos). Configurable vía ?time=.
const timeParam = computed(() => Number(getParam('time')))
const timerSeconds = computed(() =>
  Number.isFinite(timeParam.value) && timeParam.value > 0 ? timeParam.value : 45,
)
const TIMER_MS = computed(() => timerSeconds.value * 1000)
const TICK_MS = 100

const currentIndex = ref(0)
const correctCount = ref(0)
const showResult = ref(false)
const isCorrect = ref(null)
const revealed = ref(false)
const gameOver = ref(false)
const words = ref([])
// Mazo completo de la categoría (para "Reiniciar" desde cualquier ronda).
const fullDeck = ref([])
// Palabras falladas en la ronda actual. Solo viven en memoria durante la
// sesión de estudio: al salir de la vista se descartan.
const failedWords = ref([])
// Número de ronda de repaso (0 = ronda normal con todo el mazo).
const reviewRound = ref(0)
const timeLeftMs = ref(TIMER_MS.value)
// Evita que el timeout se dispare más de una vez por pregunta.
let timedOut = false

const character = computed(() => {
  const c = voiceStore.character
  if (c) {
    return { name: c.title, value: c.id_style_default.toString(), word: c.word }
  }
  return {
    name: Characters[0].name,
    value: Characters[0].styles[0].id.toString(),
    word: Characters[0].word,
  }
})

const { playAudio, stopAllAudio } = useAudio()

watch(
  [categoryParam, () => config.value.show.length],
  () => {
    if (!categoryParam.value || config.value.show.length === 0) {
      stopAllAudio()
      router.push('/main')
      return
    }

    // Obtener todas las categorías (predefinidas + personalizadas)
    const categoryWords = categoriesStore.allCategories[categoryParam.value]

    if (!categoryWords) {
      stopAllAudio()
      router.push('/main')
      return
    }

    fullDeck.value = categoryWords
    startRound(categoryWords, 0)
  },
  { immediate: true },
)

// Reinicia el temporizador y las banderas al cambiar de pregunta.
watch(
  [currentIndex, TIMER_MS],
  () => {
    timeLeftMs.value = TIMER_MS.value
    timedOut = false
  },
  { immediate: true },
)

// El temporizador corre mientras la pregunta está activa (sin resolver).
const timerActive = computed(
  () =>
    !gameOver.value &&
    words.value.length > 0 &&
    !(showResult.value && isCorrect.value) &&
    !revealed.value,
)

watch(
  [timerActive, currentIndex],
  (_, __, onCleanup) => {
    if (!timerActive.value) return
    const id = setInterval(() => {
      timeLeftMs.value = Math.max(0, timeLeftMs.value - TICK_MS)
    }, TICK_MS)
    onCleanup(() => clearInterval(id))
  },
  { immediate: true },
)

// Al agotarse el tiempo: se marca incorrecta y se avanza automáticamente.
watch([timeLeftMs, timerActive], () => {
  if (timeLeftMs.value > 0 || !timerActive.value || timedOut) return
  timedOut = true
  stopAllAudio()
  goNext()
})

const CORRECT_MESSAGES = [
  '正解です！',
  '合っています！',
  'その通りです！',
  'まるです！',
  'よくできました！',
  '完璧です！',
]
const INCORRECT_MESSAGES = [
  '不正解です！',
  '違います！',
  '間違いです！',
  '残念、不正解です。',
  'それは間違っています！',
]

async function handleAnswer(isAnswerCorrect) {
  isCorrect.value = isAnswerCorrect
  showResult.value = true

  const messages = isAnswerCorrect ? CORRECT_MESSAGES : INCORRECT_MESSAGES
  if (isAnswerCorrect) correctCount.value++
  const audio = messages[Math.floor(Math.random() * messages.length)]
  await playAudio(audio, character.value.value.toString())
}

function handleSeeAnswer() {
  // Ver la respuesta cuenta como incorrecta (no suma al conteo de aciertos).
  revealed.value = true
}

// Avanza a la siguiente pregunta (o termina). Las preguntas no acertadas
// (incorrecta, ver respuesta, saltar o tiempo agotado) se registran como falladas.
function goNext() {
  if (!(showResult.value && isCorrect.value) && currentWord.value) {
    failedWords.value.push(currentWord.value)
  }
  showResult.value = false
  isCorrect.value = null
  revealed.value = false
  if (currentIndex.value < words.value.length - 1) {
    currentIndex.value++
  } else {
    gameOver.value = true
  }
}

// Saltar: marca la pregunta como incorrecta y pasa a la siguiente.
function handleSkip() {
  stopAllAudio()
  goNext()
}

// Inicia una ronda con las palabras dadas (barajadas) y limpia el estado.
function startRound(list, round) {
  currentIndex.value = 0
  correctCount.value = 0
  gameOver.value = false
  showResult.value = false
  isCorrect.value = null
  revealed.value = false
  timeLeftMs.value = TIMER_MS.value
  timedOut = false
  failedWords.value = []
  reviewRound.value = round
  words.value = [...list].sort(() => Math.random() - 0.5)
}

// Reinicia con el mazo completo de la categoría.
function handleRestart() {
  startRound(fullDeck.value, 0)
}

// Nueva ronda solo con las palabras falladas en la ronda anterior.
function handleReviewFailed() {
  if (failedWords.value.length === 0) return
  startRound(failedWords.value, reviewRound.value + 1)
}

// Pantalla final: foco automático en la primera opción y navegación con flechas.
const gameOverRef = ref(null)

watch(gameOver, async (over) => {
  if (!over) return
  await nextTick()
  focusFirst(gameOverRef.value)
})

function handleGameOverKeyDown(e) {
  if (!gameOver.value) return
  const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
  if (!delta) return
  e.preventDefault()
  moveFocus(gameOverRef.value, delta)
}

onMounted(() => document.addEventListener('keydown', handleGameOverKeyDown))
onUnmounted(() => document.removeEventListener('keydown', handleGameOverKeyDown))

function handleBackToDashboard() {
  stopAllAudio()
  router.push('/main')
}

const currentWord = computed(() => words.value[currentIndex.value])
const total = computed(() => words.value.length)
const grade = computed(() => (total.value > 0 ? (correctCount.value / total.value) * 10 : 0))
const timerFill = computed(() => (1 - timeLeftMs.value / TIMER_MS.value) * 100)
// La barra se pone en rojo en los últimos segundos.
const timeRunningOut = computed(() => timeLeftMs.value <= 5000)
</script>

<template>
  <div v-if="words.length === 0" class="min-h-screen flex items-center justify-center">
    <p>Cargando...</p>
  </div>

  <div
    v-else
    class="min-h-screen flex flex-col p-4 bg-gradient-to-br from-background to-background/90"
  >
    <div class="flex justify-between items-center mb-4">
      <Button variant="ghost" @click="handleBackToDashboard">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Volver
      </Button>
      <span class="text-sm text-muted-foreground">
        <span v-if="reviewRound > 0" class="mr-2 font-medium text-primary">
          Repaso {{ reviewRound }}
        </span>
        {{ Math.min(currentIndex + 1, total) }} / {{ total }}
      </span>
    </div>

    <!-- Barra del temporizador por pregunta -->
    <div v-if="!gameOver" class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        :class="['h-full', timeRunningOut ? 'bg-red-500' : 'bg-primary']"
        :style="{ width: `${timerFill}%`, transition: `width ${TICK_MS}ms linear` }"
      />
    </div>

    <div class="flex-1 flex flex-col items-center justify-center">
      <motion.div
        :key="currentIndex"
        :initial="{ opacity: 0, x: 20 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: -20 }"
        :transition="{ duration: 0.3 }"
        class="w-full max-w-md"
      >
        <div
          v-if="gameOver"
          ref="gameOverRef"
          class="text-center space-y-6 p-8 bg-card rounded-lg border border-border"
        >
          <h2 class="text-xl font-bold">
            {{ reviewRound > 0 ? `Repaso ${reviewRound} terminado` : 'Juego Terminado' }}
          </h2>
          <div class="space-y-1">
            <p class="text-3xl font-bold text-primary">{{ correctCount }} / {{ total }}</p>
            <p class="text-lg text-muted-foreground">Calificación: {{ grade.toFixed(1) }} / 10</p>
          </div>
          <p v-if="reviewRound > 0 && failedWords.length === 0" class="text-sm text-primary">
            ¡Ya no te quedan palabras falladas!
          </p>
          <div class="flex flex-col gap-4">
            <Button v-if="failedWords.length > 0" data-nav @click="handleReviewFailed">
              Repasar fallidas ({{ failedWords.length }})
            </Button>
            <Button
              :variant="failedWords.length > 0 ? 'secondary' : 'default'"
              data-nav
              @click="handleRestart"
            >
              Reiniciar todo
            </Button>
            <Button variant="outline" data-nav @click="handleBackToDashboard">
              Volver al inicio
            </Button>
          </div>
        </div>
        <StudyCard
          v-else
          :word="currentWord"
          :config="config"
          :show-result="showResult"
          :is-correct="isCorrect"
          :character="character"
          @answer="handleAnswer"
          @see-answer="handleSeeAnswer"
          @skip="handleSkip"
          @next="goNext"
        />
      </motion.div>
    </div>
  </div>
</template>
