<script setup>
import { motion } from 'motion-v'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Tarjeta de modo de juego seleccionable.
 * Props: title (String), description (String), icon (String, emoji),
 *        isSelected (Boolean), disabled (Boolean, default false)
 * Emits: click() — solo se emite si la tarjeta no está deshabilitada
 */
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  isSelected: { type: Boolean, required: true },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

function handleClick() {
  if (!props.disabled) emit('click')
}
</script>

<template>
  <motion.div
    :whileHover="disabled ? undefined : { y: -5 }"
    :whilePress="disabled ? undefined : { scale: 0.98 }"
  >
    <Card
      :class="cn(
        'transition-all',
        disabled
          ? 'cursor-not-allowed opacity-50 border-border bg-card'
          : isSelected
            ? 'cursor-pointer card-hover-effect border-primary border-2 bg-primary/10'
            : 'cursor-pointer card-hover-effect border-border bg-card hover:border-primary/50'
      )"
      :aria-disabled="disabled"
      @click="handleClick"
    >
      <CardContent class="p-4 flex flex-col items-center text-center gap-2">
        <div class="text-3xl mb-2">{{ icon }}</div>
        <h3 class="text-sm font-bold">{{ title }}</h3>
        <p class="text-xs text-muted-foreground">{{ description }}</p>
      </CardContent>
    </Card>
  </motion.div>
</template>
