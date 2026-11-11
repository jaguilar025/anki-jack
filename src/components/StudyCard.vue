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

/**
 * word: { japanese_basic, japanese_advance, spanish?, english? }
 * config: { show: ('audio'|'japanese'|'english')[], answer: 'japanese'|'english' }
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

function handleKeyDown(e) {
  if (e.key === 'Enter') {
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

onMounted(() => document.addEventListener('keydown', handleKeyDown))
onUnmounted(() => document.removeEventListener('keydown', handleKeyDown))

function handleShowAnswer() {
  showAnswer.value = true
  emit('see-answer')
}

async function handlePlayAudio() {
  await playAudio(props.word.japanese_basic, props.character.value)
}
</script>

<template>
  <Card class="w-full">
    <form @submit.prevent="handleSubmit">
      <CardContent class="p-6 space-y-6">
        <!-- Saltar: marca la pregunta como incorrecta y avanza -->
        <div v-if="!(showResult && (isCorrect || showAnswer))" class="flex justify-end">
          <button
            type="button"
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
            @click="handlePlayAudio"
          >
            <Volume2 :class="['h-8 w-8', isSpeaking ? 'text-primary animate-pulse' : '']" />
          </Button>

          <!-- Pista: texto en japonés (con toggle de kana) -->
          <div v-if="showJapanese()" class="flex flex-col items-center gap-2">
            <div class="flex items-center gap-2 mb-2">
              <Switch id="show-kana" v-model="showKana" />
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
          <Button type="submit" class="flex-1">Comprobar</Button>
          <Button type="button" variant="outline" class="flex-1" @click="handleShowAnswer">
            Ver respuesta
          </Button>
        </template>
        <Button v-else type="submit" class="w-full">
          {{ showResult ? 'Siguiente' : 'Comprobar' }}
        </Button>
      </CardFooter>
    </form>
  </Card>
</template>
