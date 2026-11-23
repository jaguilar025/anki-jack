<script setup>
// Ficha de un kanji (en línea, sin cambiar de vista): orden de trazos, significados, lecturas
// y datos de KANJIDIC2; vocabulario de ejemplo solo para los kanji de N5.
//  - props: data → respuesta de GET /api/kanji-info (server/routes/kanji-info.js)
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StrokeOrder from './StrokeOrder.vue'

const { t } = useI18n()

const props = defineProps({
  data: { type: Object, required: true },
})

// JLPT de KANJIDIC2 es la escala antigua (4 = más fácil); equivalencia aproximada con la actual
const JLPT_OLD = { 4: 'N5', 3: 'N4', 2: 'N3–N2', 1: 'N1' }
const GRADE = (g) =>
  g <= 6
    ? t('kanji.details.gradePrimary', { grade: g })
    : g === 8
      ? t('kanji.details.gradeSecondary')
      : g >= 9
        ? t('kanji.details.gradeNames')
        : null

const facts = computed(() => {
  const d = props.data
  return [
    d.strokes && [t('kanji.details.strokes'), d.strokes],
    d.jlptOld && [t('kanji.details.jlpt'), `≈ ${JLPT_OLD[d.jlptOld]}`],
    d.grade && [t('kanji.details.grade'), GRADE(d.grade)],
    d.frequency && [t('kanji.details.frequency'), t('kanji.details.frequencyValue', { rank: d.frequency })],
  ].filter(Boolean)
})
</script>

<template>
  <div class="space-y-4 rounded-xl border bg-card p-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
      <StrokeOrder :kanji="data.kanji" class="shrink-0" />

      <div class="min-w-0 flex-1 space-y-3">
        <div>
          <p class="japanese-text text-5xl leading-none">{{ data.kanji }}</p>
          <p class="mt-2 text-lg font-medium">{{ data.meanings.join(', ') || '—' }}</p>
        </div>

        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <template v-if="data.onyomi.length">
            <dt class="text-muted-foreground">{{ t('kanji.details.on') }}</dt>
            <dd class="japanese-text">{{ data.onyomi.join('、') }}</dd>
          </template>
          <template v-if="data.kunyomi.length">
            <dt class="text-muted-foreground">{{ t('kanji.details.kun') }}</dt>
            <dd class="japanese-text">{{ data.kunyomi.join('、') }}</dd>
          </template>
          <template v-if="data.nanori.length">
            <dt class="text-muted-foreground">{{ t('kanji.details.names') }}</dt>
            <dd class="japanese-text text-muted-foreground">{{ data.nanori.join('、') }}</dd>
          </template>
        </dl>

        <div v-if="facts.length" class="flex flex-wrap gap-1.5">
          <span v-for="[label, value] in facts" :key="label" class="rounded-full bg-muted px-2.5 py-0.5 text-xs">
            {{ label }}: <strong>{{ value }}</strong>
          </span>
        </div>
      </div>
    </div>

    <div v-if="data.vocabulary?.length" class="space-y-1.5 border-t pt-3">
      <h4 class="text-sm font-semibold">{{ t('kanji.details.vocabulary') }}</h4>
      <ul class="space-y-1 text-sm">
        <li v-for="(v, i) in data.vocabulary" :key="i" class="flex flex-wrap gap-x-2">
          <span class="japanese-text font-medium">{{ v.jp }}</span>
          <span class="japanese-text text-muted-foreground">{{ v.pron }}</span>
          <span>— {{ v.en }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
