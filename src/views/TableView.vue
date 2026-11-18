<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { motion } from 'motion-v'
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCategoriesStore } from '@/stores/categories'

const route = useRoute()
const router = useRouter()
const categoriesStore = useCategoriesStore()

const categoryParam = computed(() => {
  const q = route.query.category
  return (Array.isArray(q) ? q[0] : q) || null
})

const words = computed(() => {
  if (!categoryParam.value) return []
  return categoriesStore.allCategories[categoryParam.value] || []
})

// Si falta la categoría o no existe, volver al dashboard
watch(
  [categoryParam, () => categoriesStore.allCategories],
  () => {
    if (!categoryParam.value || !categoriesStore.allCategories[categoryParam.value]) {
      router.push('/main')
    }
  },
  { immediate: true },
)

const handleBack = () => router.push('/main')
</script>

<template>
  <div class="min-h-screen flex flex-col p-4 bg-gradient-to-br from-background to-background/90">
    <div class="flex justify-between items-center mb-4">
      <Button variant="ghost" @click="handleBack">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <div class="flex-1 flex flex-col items-center">
      <motion.div
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3 }"
        class="w-full max-w-3xl"
      >
        <h1 class="text-2xl md:text-3xl font-bold text-primary text-center mb-6">
          {{ categoryParam }}
        </h1>

        <div class="rounded-lg border border-border bg-card overflow-hidden">
          <Table class="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[30%]">Kana</TableHead>
                <TableHead class="w-[30%]">Kanji</TableHead>
                <TableHead class="w-[40%]">Traducción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(word, i) in words" :key="`${word.japanese_basic}-${i}`">
                <TableCell class="japanese-text break-words">{{ word.japanese_basic }}</TableCell>
                <TableCell class="japanese-text break-words">{{ word.japanese_advance }}</TableCell>
                <TableCell class="break-words">{{ word.spanish ?? word.english }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  </div>
</template>
