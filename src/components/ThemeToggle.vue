<script setup>
import { Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'

/**
 * Botón para alternar tema claro/oscuro.
 * Sin props ni emits. Usa useTheme() (isDark: ref, toggleDark()).
 */
const { isDark, toggleDark } = useTheme()
</script>

<template>
  <Button variant="outline" size="icon" @click="toggleDark()">
    <Sun v-if="isDark" class="h-[1.2rem] w-[1.2rem]" />
    <Moon v-else class="h-[1.2rem] w-[1.2rem]" />
    <span class="sr-only">Toggle theme</span>
  </Button>
</template>
