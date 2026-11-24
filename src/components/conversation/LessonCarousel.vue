<script setup>
// Carrusel horizontal para elegir la lección (初中級 1 … 15). Se desliza con el dedo, la rueda
// o las flechas; la lección elegida queda resaltada y centrada.
//  - v-model: número de lección (1..15)
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { LESSONS, LEVEL_LABEL } from '@/lib/conversationPrompt'

const lesson = defineModel({ type: Number, default: 1 })
const { t } = useI18n()
const track = useTemplateRef('track')

function centerSelected(behavior = 'smooth') {
  const el = track.value?.querySelector(`[data-lesson="${lesson.value}"]`)
  el?.scrollIntoView({ behavior, inline: 'center', block: 'nearest' })
}

function select(n) {
  lesson.value = Math.min(LESSONS.length, Math.max(1, n))
}

watch(lesson, () => nextTick(() => centerSelected()))
onMounted(() => centerSelected('instant'))

// La rueda vertical del mouse desplaza el carrusel en horizontal
function onWheel(event) {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
  event.preventDefault()
  track.value.scrollLeft += event.deltaY
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      :title="t('conversation.prev')"
      :disabled="lesson <= 1"
      class="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-foreground/10 disabled:opacity-30"
      @click="select(lesson - 1)"
    >
      <ChevronLeft class="size-5" />
    </button>

    <div
      ref="track"
      class="scrollbar-hide flex flex-1 snap-x snap-mandatory gap-2 overflow-x-auto px-[35%] py-1"
      @wheel="onWheel"
    >
      <button
        v-for="l in LESSONS"
        :key="l.lesson"
        type="button"
        :data-lesson="l.lesson"
        :class="[
          'flex w-28 shrink-0 snap-center flex-col items-center rounded-xl border px-2 py-2 text-center transition',
          l.lesson === lesson ? 'scale-105 border-primary bg-primary/15 shadow' : 'opacity-60 hover:opacity-100',
        ]"
        @click="select(l.lesson)"
      >
        <span class="japanese-text text-xs text-muted-foreground">{{ LEVEL_LABEL }}</span>
        <span class="text-2xl font-bold leading-tight">{{ l.lesson }}</span>
        <span class="japanese-text line-clamp-1 text-[11px]">{{ l.title }}</span>
      </button>
    </div>

    <button
      type="button"
      :title="t('conversation.next')"
      :disabled="lesson >= LESSONS.length"
      class="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-foreground/10 disabled:opacity-30"
      @click="select(lesson + 1)"
    >
      <ChevronRight class="size-5" />
    </button>
  </div>
</template>
