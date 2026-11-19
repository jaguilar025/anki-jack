<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'motion-v'
import { Volume2 } from '@lucide/vue'
import { useAudio } from '@/composables/useAudio'
import { moveFocus, isNavFocused } from '@/lib/focusNav'

/**
 * word: { japanese_basic, japanese_advance, spanish?, english? }
 * config: { show: ('audio'|'japanese'|'english')[], answer: 'japanese'|'english', autoPlay?: boolean }
 * character: { value } (id del estilo de voz)
 */
const props = defineProps({
  word: { type: Object, required: true },
  config: { type: Object, required: true },
  showResult: { type: Boolean, required: true },
  isCorrect: { type: Boolean, default: null },
  character: { type: Object, required: true },
})

const emit = defineEmits(['answer', 'see-answer', 'skip', 'next'])

const answer = ref('')
const showKana = ref(false)
const inputRef = ref(null)
const cardRef = ref(null)
const showAnswer = ref(false)
const { playAudio, isSpeaking } = useAudio()

const showAudio = () => props.config.show.includes('audio')
const showJapanese = () => props.config.show.includes('japanese')
const showEnglish = () => props.config.show.includes('english')
const answerInJapanese = () => props.config.answer === 'japanese'

watch(
  () => [props.word, props.showResult],
  async () => {
    // Enfoca el input al mostrar la tarjeta y reinicia la respuesta al pasar a la siguiente palabra
    if (!props.showResult) {
      answer.value = ''
      await nextTick()
      inputRef.value?.$el?.focus()
    }
  },
  { immediate: true },
)

// Audio automático: reproduce la palabra en cuanto se carga cada tarjeta
watch(
  () => props.word,
  (word) => {
    if (word && props.config.autoPlay && showAudio()) handlePlayAudio()
  },
  { immediate: true },
)

function validateAnswer(answerText, correctWord) {
  // Normaliza ambas cadenas: elimina acentos/símbolos y convierte a minúsculas
  const normalize = (str) =>
    str
      .normalize('NFD') // Separa caracteres y diacríticos (ej. "é" -> "e" + ´)
      .replace(/[̀-ͯ]/g, '') // Elimina diacríticos
      .toLowerCase()
      .trim()

  const normalizedAnswer = normalize(answerText)
  const normalizedCorrect = normalize(correctWord)

  // Valida que:
  // 1. El answer no esté vacío.
  // 2. Si el correctWord tiene más de 3 caracteres, el answer debe tener al menos 3.
  // 3. El normalizedCorrect incluya normalizedAnswer.
  return (
    normalizedAnswer !== '' &&
    (normalizedCorrect.length <= 3 || normalizedAnswer.length >= 3) &&
    normalizedCorrect.includes(normalizedAnswer)
  )
}

function handleSubmit() {
  if (props.showResult && showAnswer.value) {
    emit('next')
    return
  }

  if (props.showResult && !showAnswer.value && props.isCorrect) {
    emit('next')
    return
  }

  let isAnswerCorrect

  if (answerInJapanese()) {
    // Se valida contra el japonés (kanji/kana)
    isAnswerCorrect =
      answer.value.trim().toLowerCase() === props.word.japanese_advance.toLowerCase() ||
      answer.value.trim().toLowerCase() === props.word.japanese_basic.toLowerCase()
  } else {
    // Se valida contra la traducción (español/inglés)
    isAnswerCorrect = validateAnswer(answer.value, props.word.spanish ?? props.word.english ?? '')
  }

  emit('answer', isAnswerCorrect)
}

const cardEl = () => cardRef.value?.$el
const inputEl = () => inputRef.value?.$el

// Ctrl solo (pulsado y soltado sin otra tecla) reproduce el audio.
// Así no interfiere con atajos como Ctrl+C / Ctrl+V.
let ctrlAlone = false

function handleKeyDown(e) {
  // No interceptar teclas mientras el IME está componiendo (escritura en japonés).
  if (e.isComposing || e.keyCode === 229) return

  if (e.key === 'Control') {
    if (!e.repeat) ctrlAlone = true
    return
  }
  ctrlAlone = false

  // Arriba/abajo: mover el foco entre las opciones de la tarjeta.
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    moveFocus(cardEl(), e.key === 'ArrowDown' ? 1 : -1)
    return
  }

  // Izquierda/derecha: también navegan, salvo en el input (ahí mueven el cursor).
  if (
    (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
    document.activeElement !== inputEl() &&
    isNavFocused(cardEl())
  ) {
    e.preventDefault()
    moveFocus(cardEl(), e.key === 'ArrowRight' ? 1 : -1)
    return
  }

  if (e.key === 'Enter') {
    // Si el foco está en un botón o switch de la tarjeta, Enter lo activa de forma nativa.
    if (document.activeElement !== inputEl() && isNavFocused(cardEl())) return

    e.preventDefault()

    // Si estamos en la etapa del "Siguiente", emite next
    if (props.showResult && (props.isCorrect || showAnswer.value)) {
      emit('next')
    } else {
      // Si aún no se mostró el resultado, comprobar la respuesta
      handleSubmit()
    }
  }
}

function handleKeyUp(e) {
  if (e.key === 'Control' && ctrlAlone && showAudio()) handlePlayAudio()
  ctrlAlone = false
}

function resetCtrl() {
  ctrlAlone = false
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', resetCtrl)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('blur', resetCtrl)
})

function handleShowAnswer() {
  showAnswer.value = true
  emit('see-answer')
}

async function handlePlayAudio() {
  await playAudio(props.word.japanese_basic, props.character.value)
}
</script>

<template>
  <Card ref="cardRef" class="w-full">
    <form @submit.prevent="handleSubmit">
      <CardContent class="p-6 space-y-6">
        <!-- Saltar: marca la pregunta como incorrecta y avanza -->
        <div v-if="!(showResult && (isCorrect || showAnswer))" class="flex justify-end">
          <button
            type="button"
            data-nav
            class="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            @click="emit('skip')"
          >
            Saltar →
          </button>
        </div>

        <div class="flex flex-col items-center gap-4">
          <!-- Pista: audio -->
          <Button
            v-if="showAudio()"
            type="button"
            variant="outline"
            size="icon"
            class="h-16 w-16 rounded-full"
            data-nav
            title="Reproducir audio (Ctrl)"
            @click="handlePlayAudio"
          >
            <Volume2 :class="['h-8 w-8', isSpeaking ? 'text-primary animate-pulse' : '']" />
          </Button>

          <!-- Pista: texto en japonés (con toggle de kana) -->
          <div v-if="showJapanese()" class="flex flex-col items-center gap-2">
            <div class="flex items-center gap-2 mb-2">
              <Switch id="show-kana" v-model="showKana" data-nav />
              <Label for="show-kana">Mostrar kana</Label>
            </div>
            <h3 class="japanese-text text-[40px] font-normal">
              {{ showKana ? word.japanese_basic : word.japanese_advance }}
            </h3>
          </div>

          <!-- Pista: traducción (español/inglés) -->
          <h3 v-if="showEnglish()" class="text-xl font-bold">{{ word.spanish ?? word.english }}</h3>
        </div>

        <!-- Input con borde rojo cuando la respuesta es incorrecta; sigue habilitado para escribir -->
        <div class="space-y-2">
          <Input
            ref="inputRef"
            data-nav
            v-model="answer"
            type="text"
            placeholder="Escribe tu respuesta..."
            :class="[
              'text-center japanese-text',
              showResult && !isCorrect && !showAnswer ? 'border-red-500 focus-visible:ring-red-500' : '',
            ]"
            :disabled="showResult && (isCorrect || showAnswer)"
          />
        </div>

        <AnimatePresence>
          <motion.div
            v-if="showResult && (isCorrect || showAnswer)"
            :initial="{ opacity: 0, height: 0 }"
            :animate="{ opacity: 1, height: 'auto' }"
            :exit="{ opacity: 0, height: 0 }"
            class="text-center space-y-2"
          >
            <div v-if="isCorrect" class="text-2xl text-green-500">✓</div>

            <div class="japanese-text font-bold">
              {{ word.japanese_advance }}
              <span v-if="word.japanese_advance !== word.japanese_basic" class="text-muted-foreground ml-2">
                ({{ word.japanese_basic }})
              </span>
            </div>
            <p class="text-sm text-muted-foreground">{{ word.spanish ?? word.english }}</p>
          </motion.div>
        </AnimatePresence>
      </CardContent>

      <CardFooter class="flex justify-center p-6 pt-0">
        <template v-if="showResult && !isCorrect && !showAnswer">
          <Button type="submit" class="flex-1" data-nav>Comprobar</Button>
          <Button
            type="button"
            variant="outline"
            class="flex-1"
            data-nav
            @click="handleShowAnswer"
          >
            Ver respuesta
          </Button>
        </template>
        <Button v-else type="submit" class="w-full" data-nav>
          {{ showResult ? 'Siguiente' : 'Comprobar' }}
        </Button>
      </CardFooter>
    </form>
  </Card>
</template>
