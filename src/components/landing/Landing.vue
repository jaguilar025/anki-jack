<script setup>
import InfiniteMenu from './InfiniteMenu.vue'
import voices from '@/data/voices.json'

const items = voices
</script>

<template>
  <div class="h-full w-full">
    <InfiniteMenu :items="items" />
  </div>
</template>
