<script setup>
// Dibuja un kanji: reconocimiento por trazos (Google, sin IA) en vivo mientras escribes.
// Los candidatos aparecen tras cada trazo; al elegir uno su ficha se muestra debajo, en la misma
// vista, para poder probar otro candidato sin perder el dibujo.
import { nextTick, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ExternalLink, Loader2, PenTool } from '@lucide/vue'
import DrawingCanvas from '@/components/DrawingCanvas.vue'
import KanjiDetails from '@/components/kanji/KanjiDetails.vue'
import { recognizeKanji } from '@/lib/handwriting'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const canvas = ref(null)
const details = ref(null)
const candidates = ref([])
const recognizing = ref(false)
/** Clave i18n del error mostrado (se traduce en la plantilla para seguir el idioma) */
const error = ref('')
/** Ficha del kanji elegido (respuesta de /api/kanji-info) */
const kanjiResult = ref(null)
/** Kanji elegido que no está en el diccionario */
const missing = ref('')
const loadingInfo = ref('')

let controller = null

async function onStrokes(strokes) {
  error.value = ''
  controller?.abort() // solo importa la respuesta del último trazo
  if (!strokes.length) {
    // Lienzo limpio: empezar de cero
    candidates.value = []
    kanjiResult.value = null
    missing.value = ''
    recognizing.value = false
    return
  }
  controller = new AbortController()
  recognizing.value = true
  try {
    candidates.value = await recognizeKanji(strokes, { signal: controller.signal })
    recognizing.value = false
  } catch (err) {
    if (err.name === 'AbortError') return
    console.error('Error al reconocer:', err)
    error.value = 'kanji.draw.errors.recognize'
    recognizing.value = false
  }
}

async function selectKanji(kanji) {
  missing.value = ''
  loadingInfo.value = kanji
  try {
    const res = await fetch(`/api/kanji-info?k=${encodeURIComponent(kanji)}`)
    if (res.status === 404) {
      kanjiResult.value = null
      missing.value = kanji
      return
    }
    if (!res.ok) throw new Error(`Error ${res.status}`)
    kanjiResult.value = (await res.json()).kanji
    await nextTick()
    details.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch (err) {
    console.error('Error al cargar la ficha:', err)
    error.value = 'kanji.draw.errors.info'
  } finally {
    loadingInfo.value = ''
  }
}

</script>

<template>
  <div class="min-h-screen bg-black flex flex-col items-center p-2 pb-10">
    <div class="w-full mb-4">
      <RouterLink to="/main">
        <Button variant="ghost" size="sm" class="text-white hover:bg-white/20">
          <ArrowLeft class="mr-2 h-4 w-4" />
          {{ t('common.home') }}
        </Button>
      </RouterLink>
    </div>

    <Card class="w-full max-w-xl">
      <CardHeader class="text-center pb-2">
        <CardTitle class="flex items-center justify-center gap-2 text-lg">
          <PenTool class="h-5 w-5" />
          {{ t('kanji.draw.title') }}
        </CardTitle>
        <p class="text-xs text-muted-foreground">{{ t('kanji.draw.hint') }}</p>
      </CardHeader>

      <CardContent class="flex flex-col items-center gap-4">
        <DrawingCanvas ref="canvas" @strokes-change="onStrokes" />

        <!-- Candidatos -->
        <div class="w-full max-w-[420px] space-y-2">
          <div class="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
            <span>{{ t('kanji.draw.candidates') }}</span>
            <Loader2 v-if="recognizing" class="size-3 animate-spin" />
          </div>
          <div class="flex min-h-14 flex-wrap gap-2">
            <button
              v-for="kanji in candidates"
              :key="kanji"
              type="button"
              :disabled="Boolean(loadingInfo)"
              :class="[
                'japanese-text flex size-14 items-center justify-center rounded-lg border text-3xl transition hover:border-primary hover:bg-primary/10 disabled:opacity-50',
                (kanjiResult?.kanji === kanji || missing === kanji) && 'border-primary bg-primary/15',
              ]"
              :title="t('kanji.draw.view', { kanji })"
              @click="selectKanji(kanji)"
            >
              <Loader2 v-if="loadingInfo === kanji" class="size-5 animate-spin" />
              <template v-else>{{ kanji }}</template>
            </button>
            <p v-if="!candidates.length && !recognizing" class="self-center text-sm text-muted-foreground">
              {{ t('kanji.draw.empty') }}
            </p>
          </div>

          <p v-if="missing" class="rounded-lg bg-muted p-3 text-sm">
            <span class="japanese-text text-lg">{{ missing }}</span> {{ t('kanji.draw.missing') }}
            <a
              :href="`https://jisho.org/search/${encodeURIComponent(missing)}%20%23kanji`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 underline"
            >
              {{ t('kanji.draw.viewInJisho') }} <ExternalLink class="size-3" />
            </a>
          </p>
          <p v-if="error" class="text-sm text-red-600">{{ t(error) }}</p>
        </div>

        <!-- Ficha del kanji elegido -->
        <KanjiDetails v-if="kanjiResult" ref="details" :data="kanjiResult" class="w-full max-w-[420px]" />
      </CardContent>
    </Card>
  </div>
</template>
