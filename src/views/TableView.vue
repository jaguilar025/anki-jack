<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { motion } from 'motion-v'
import { ArrowLeft, Volume2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCategoriesStore } from '@/stores/categories'
import { useVoiceStore } from '@/stores/voice'
import { useAudio } from '@/composables/useAudio'
import { Characters } from '@/data/voicevox-characters'
import { parseShowParam } from '@/lib/showOptions'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const categoriesStore = useCategoriesStore()

const categoryParam = computed(() => {
  const q = route.query.category
  return (Array.isArray(q) ? q[0] : q) || null
})

// Columnas según las opciones de "Mostrar" del Dashboard (audio, kanji, furigana, inglés).
// Sin `show` en la URL (enlaces antiguos) o sin ninguna opción marcada, se muestran todas.
const columns = computed(() => {
  const q = route.query.show
  const show = parseShowParam(Array.isArray(q) ? q[0] : q)
  const all = show.length === 0
  const has = (key) => all || show.includes(key)
  return { audio: has('audio'), kanji: has('kanji'), furigana: has('furigana'), english: has('english') }
})

const words = computed(() => {
  if (!categoryParam.value) return []
  return categoriesStore.allCategories[categoryParam.value] || []
})

// Si falta la categoría o no existe, volver al dashboard
watch(
  [categoryParam, () => categoriesStore.allCategories],
  () => {
    if (!categoryParam.value || !categoriesStore.allCategories[categoryParam.value]) {
      router.push('/main')
    }
  },
  { immediate: true },
)

// --- Audio de cada palabra (con el personaje elegido, como en las tarjetas de estudio) ---
const voiceStore = useVoiceStore()
const speaker = computed(
  () => (voiceStore.character?.id_style_default ?? Characters[0].styles[0].id).toString(),
)
const { playAudio, stopAllAudio, isSpeaking } = useAudio()
const playingIndex = ref(null)

async function playWord(word, index) {
  playingIndex.value = index
  try {
    await playAudio(word.japanese_basic, speaker.value)
  } catch (error) {
    console.error('Error al reproducir la palabra:', error)
  }
}

const handleBack = () => {
  stopAllAudio()
  router.push('/main')
}
</script>

<template>
  <div class="min-h-screen flex flex-col p-4 bg-gradient-to-br from-background to-background/90">
    <div class="flex justify-between items-center mb-4">
      <Button variant="ghost" @click="handleBack">
        <ArrowLeft class="mr-2 h-4 w-4" />
        {{ t('common.back') }}
      </Button>
    </div>

    <div class="flex-1 flex flex-col items-center">
      <motion.div
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3 }"
        class="w-full max-w-3xl"
      >
        <h1 class="text-2xl md:text-3xl font-bold text-primary text-center mb-6">
          {{ categoryParam }}
        </h1>

        <div class="rounded-lg border border-border bg-card overflow-hidden">
          <!-- Cada columna se ajusta a su contenido y cada fila queda en una línea (las celdas no
               hacen salto de línea). Si no cabe, la tabla se desplaza en horizontal. -->
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-if="columns.audio" class="w-10"><span class="sr-only">{{ t('study.table.audio') }}</span></TableHead>
                <TableHead v-if="columns.kanji">Kanji</TableHead>
                <TableHead v-if="columns.furigana">Kana</TableHead>
                <TableHead v-if="columns.english" class="w-full">{{ t('study.table.translation') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(word, i) in words" :key="`${word.japanese_basic}-${i}`">
                <TableCell v-if="columns.audio" class="w-10 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 rounded-full"
                    :title="t('study.table.listen', { word: word.japanese_basic })"
                    @click="playWord(word, i)"
                  >
                    <Volume2
                      :class="['size-4', isSpeaking && playingIndex === i ? 'text-primary animate-pulse' : '']"
                    />
                  </Button>
                </TableCell>
                <TableCell v-if="columns.kanji" class="japanese-text">{{ word.japanese_advance }}</TableCell>
                <TableCell v-if="columns.furigana" class="japanese-text">{{ word.japanese_basic }}</TableCell>
                <TableCell v-if="columns.english">{{ word.spanish ?? word.english }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  </div>
</template>
