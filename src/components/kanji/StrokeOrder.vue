<script setup>
// Orden de trazos animado de un kanji, con los datos de KanjiVG (un SVG por kanji, cada trazo
// es una ruta en su orden). Se descarga del CDN jsDelivr al mostrarse.
// Licencia de los datos: KanjiVG © Ulrich Apel, CC BY-SA 3.0 (https://kanjivg.tagaini.net)
import { computed, ref, watch } from 'vue'
import { Loader2, RotateCcw } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  kanji: { type: String, required: true },
})

const strokes = ref([]) // [{ d, label: { x, y } | null }]
const status = ref('loading') // 'loading' | 'ready' | 'missing'
const run = ref(0) // cambia para repetir la animación

const STROKE_TIME = 0.55 // segundos por trazo
const GAP = 0.15

// Archivo de KanjiVG: código Unicode en hexadecimal de 5 dígitos (日 → 065e5.svg)
const url = computed(() => {
  const hex = props.kanji.codePointAt(0).toString(16).padStart(5, '0')
  return `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`
})

async function load() {
  status.value = 'loading'
  strokes.value = []
  const requested = props.kanji
  try {
    const res = await fetch(url.value)
    if (!res.ok) throw new Error(String(res.status))
    const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml')
    if (requested !== props.kanji) return
    // Trazos en orden (id "kvg:065e5-s1", "-s2"…) y sus números ("kvg:StrokeNumbers_…")
    const paths = [...doc.querySelectorAll('path[id*="-s"]')]
    const labels = [...doc.querySelectorAll('[id^="kvg:StrokeNumbers"] text')].map((t) => {
      const m = t.getAttribute('transform')?.match(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)/)
      return m ? { x: Number(m[1]), y: Number(m[2]) } : null
    })
    strokes.value = paths.map((p, i) => ({ d: p.getAttribute('d'), label: labels[i] ?? null }))
    status.value = strokes.value.length ? 'ready' : 'missing'
    run.value++
  } catch {
    if (requested === props.kanji) status.value = 'missing'
  }
}

watch(() => props.kanji, load, { immediate: true })

const delay = (i) => `${i * (STROKE_TIME + GAP)}s`
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="relative aspect-square w-40 rounded-lg border bg-white text-black">
      <div v-if="status === 'loading'" class="absolute inset-0 flex items-center justify-center">
        <Loader2 class="size-6 animate-spin text-gray-400" />
      </div>
      <p v-else-if="status === 'missing'" class="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-gray-500">
        {{ t('kanji.order.missing') }}
      </p>

      <svg v-else :key="run" viewBox="0 0 109 109" class="size-full">
        <!-- Guía: el kanji completo en gris claro -->
        <path v-for="(s, i) in strokes" :key="`g${i}`" :d="s.d" class="fill-none stroke-gray-200" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Trazos animados uno tras otro (pathLength=1 permite animar sin medir la ruta) -->
        <path
          v-for="(s, i) in strokes"
          :key="`s${i}`"
          :d="s.d"
          pathLength="1"
          class="stroke-anim fill-none stroke-current"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="{ animationDuration: `${STROKE_TIME}s`, animationDelay: delay(i) }"
        />
        <!-- Números de trazo -->
        <text
          v-for="(s, i) in strokes"
          v-show="s.label"
          :key="`n${i}`"
          :x="s.label?.x"
          :y="s.label?.y"
          class="stroke-num fill-red-500 text-[8px]"
          :style="{ animationDelay: delay(i) }"
        >
          {{ i + 1 }}
        </text>
      </svg>
    </div>

    <button
      v-if="status === 'ready'"
      type="button"
      class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      @click="run++"
    >
      <RotateCcw class="size-3" /> {{ t('kanji.order.repeat', { count: strokes.length }) }}
    </button>
  </div>
</template>

<style scoped>
.stroke-anim {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation-name: draw;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
}
.stroke-num {
  opacity: 0;
  animation: appear 0.2s forwards;
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes appear {
  to {
    opacity: 1;
  }
}
</style>
