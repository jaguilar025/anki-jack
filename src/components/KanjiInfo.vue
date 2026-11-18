<script setup>
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from '@lucide/vue'

/**
 * Ficha de un kanji (resultado de la captura).
 * Props:
 *  - kanjiResult: {
 *      code: String, kanji: String, onyomi: String, kunyomi: String,
 *      meaning: String, url: String, gif: String, strokes: Number,
 *      vocabulary: [{ jp: String, pron: String, en: String }]
 *    }
 * Emits: new-search() — botón "Nueva Captura"
 */
defineProps({
  kanjiResult: { type: Object, required: true },
})

defineEmits(['new-search'])
</script>

<template>
  <div class="min-h-screen bg-black p-4">
    <div class="max-w-md mx-auto">
      <div class="flex items-center justify-between mb-6">
        <RouterLink to="/main">
          <Button variant="ghost" size="sm">
            <ArrowLeft class="mr-2 h-4 w-4" />
            Inicio
          </Button>
        </RouterLink>
        <Button class="bg-gray-300" size="sm" @click="$emit('new-search')">
          Nueva Captura
        </Button>
      </div>

      <Card>
        <CardContent class="p-6 bg-black rounded-lg">
          <div class="flex flex-col items-center gap-4">
            <img
              :src="kanjiResult.gif || '/placeholder.svg'"
              :alt="`Orden de trazos para ${kanjiResult.kanji}`"
              width="200"
              height="200"
              class="rounded-lg invert"
            />
            <div class="text-gray-400">
              Strokes: {{ kanjiResult.strokes }}
            </div>
          </div>

          <div class="flex flex-col gap-1 mt-8">
            <div class="flex flex-row gap-2">
              <p class="text-gray-500">Meaning:</p>
              <p class="text-gray-600">{{ kanjiResult.meaning }}</p>
            </div>
            <div class="flex flex-row gap-2">
              <p class="text-gray-500">Onyomi:</p>
              <p class="text-gray-600">{{ kanjiResult.onyomi }}</p>
            </div>
            <div class="flex flex-row gap-2">
              <p class="text-gray-500">Kunyomi:</p>
              <p class="text-gray-600">{{ kanjiResult.kunyomi }}</p>
            </div>

            <div class="my-6">
              <p class="text-gray-500 mb-2">Vocabulary:</p>
              <div class="space-y-2">
                <div
                  v-for="(word, index) in kanjiResult.vocabulary"
                  :key="index"
                  class="bg-black border border-gray-500 p-3 rounded-lg"
                >
                  <div class="font-medium">{{ word.jp }}</div>
                  <div class="text-sm text-gray-600">{{ word.pron }}</div>
                  <div class="text-sm text-gray-700">{{ word.en }}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
