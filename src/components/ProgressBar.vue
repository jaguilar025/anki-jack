<script setup>
import { motion } from 'motion-v'

/**
 * Barra de progreso.
 * Props: progress (Number, 0-100)
 * Sin emits.
 */
defineProps({
  progress: { type: Number, required: true },
})
</script>

<template>
  <div class="w-full h-2 bg-secondary rounded-full overflow-hidden mb-6">
    <motion.div
      class="h-full bg-primary"
      :initial="{ width: 0 }"
      :animate="{ width: `${progress}%` }"
      :transition="{ duration: 0.3 }"
    />
  </div>
</template>
