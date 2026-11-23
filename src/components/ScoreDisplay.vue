<script setup>
import { motion } from 'motion-v'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

/**
 * Marcador de puntos y vidas.
 * Props: score (Number), lives (Number)
 * Sin emits.
 */
defineProps({
  score: { type: Number, required: true },
  lives: { type: Number, required: true },
})
</script>

<template>
  <div class="flex items-center gap-4">
    <motion.div
      :key="score"
      class="text-sm font-bold"
      :initial="{ scale: 1 }"
      :animate="{ scale: [1, 1.2, 1] }"
      :transition="{ duration: 0.3 }"
    >
      {{ t('study.score.points', { score }) }}
    </motion.div>
    <div class="flex">
      <motion.div
        v-for="i in lives"
        :key="i"
        class="text-lg"
        :initial="{ opacity: 1 }"
        :animate="{ opacity: 1 }"
      >
        ⭐
      </motion.div>
    </div>
  </div>
</template>
