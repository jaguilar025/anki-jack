<script setup>
// Barra de gramática de la lección (entre el subtítulo del avatar y el campo de texto).
// Cada punto es un chip con su step (st1 / st2) en la esquina; tocarlo lo enfoca (otra vez lo
// quita) y "?" pide que el avatar lo explique. La pastilla del inicio permite cambiar de lección.
//  - props: lesson (datos de la lección), focus ({ st, grammar } | null), disabled
//  - emits: toggle(st, grammar), explain(grammar), change-lesson
import { useI18n } from 'vue-i18n'
import { LEVEL_LABEL } from '@/lib/conversationPrompt'

defineProps({
  lesson: { type: Object, required: true },
  focus: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'explain', 'change-lesson'])
const { t } = useI18n()

const STEP_BADGE = {
  1: 'bg-sky-500 text-white',
  2: 'bg-violet-500 text-white',
}
</script>

<template>
  <div class="scrollbar-hide flex items-center gap-2 overflow-x-auto px-1 pb-1 pt-2.5">
    <button
      type="button"
      :title="t('conversation.changeLesson')"
      class="glass japanese-text shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
      @click="emit('change-lesson')"
    >
      {{ LEVEL_LABEL }} {{ lesson.lesson }} ▾
    </button>

    <template v-for="step in lesson.steps" :key="step.st">
      <div
        v-for="g in step.grammar"
        :key="`${step.st}-${g}`"
        :class="[
          'glass relative flex shrink-0 items-center rounded-full text-sm transition',
          focus?.st === step.st && focus?.grammar === g ? 'ring-2 ring-primary' : '',
        ]"
      >
        <button
          type="button"
          :disabled="disabled"
          :title="t('conversation.focus', { grammar: g })"
          class="japanese-text whitespace-nowrap py-1.5 pl-3 pr-1 disabled:opacity-60"
          @click="emit('toggle', step.st, g)"
        >
          {{ g }}
        </button>
        <button
          type="button"
          :disabled="disabled"
          :title="t('conversation.explain', { grammar: g })"
          class="mr-1 flex size-5 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-bold hover:bg-foreground/20 disabled:opacity-40"
          @click="emit('explain', g)"
        >
          ?
        </button>
        <span
          :class="['absolute -right-1 -top-2 rounded-full px-1.5 text-[9px] font-semibold leading-4', STEP_BADGE[step.st]]"
        >
          st{{ step.st }}
        </span>
      </div>
    </template>
  </div>
</template>
