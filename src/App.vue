<script setup>
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()
</script>

<template>
  <RouterView />
  <Toaster :theme="isDark ? 'dark' : 'light'" rich-colors />
</template>
