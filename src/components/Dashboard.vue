<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { motion } from 'motion-v'
import { RotateCcw } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import ModeCard from '@/components/ModeCard.vue'
import CategoryWheel from '@/components/CategoryWheel.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import DataManagement from '@/components/DataManagement.vue'
import UploadStudyList from '@/components/UploadStudyList.vue'
import { useCategoriesStore } from '@/stores/categories'

const router = useRouter()
const categoriesStore = useCategoriesStore()

const selectedCategory = ref('')
// Configuración personalizada del modo de práctica. Por defecto: mostrar
// japonés + audio y validar la respuesta en inglés (equivale al antiguo modo 3).
const showOptions = ref({ audio: true, japanese: true, english: false })
const answerOption = ref('english')
const timerSeconds = ref(45)

const showItems = [
  { key: 'audio', label: 'Audio' },
  { key: 'japanese', label: 'Japonés' },
  { key: 'english', label: 'Inglés' },
]
const answerItems = [
  { key: 'japanese', label: 'Japonés' },
  { key: 'english', label: 'Inglés' },
]

const selectedShow = computed(() => Object.keys(showOptions.value).filter((k) => showOptions.value[k]))
const categoryOptions = computed(() => Object.keys(categoriesStore.allCategories))

const toggleShow = (key) => {
  showOptions.value = { ...showOptions.value, [key]: !showOptions.value[key] }
}

const handleStart = () => {
  if (!selectedCategory.value || selectedShow.value.length === 0) return
  router.push({
    path: '/study',
    query: {
      category: selectedCategory.value,
      show: selectedShow.value.join(','),
      answer: answerOption.value,
      time: String(timerSeconds.value > 0 ? timerSeconds.value : 45),
    },
  })
}

const handleConsultTable = () => {
  if (!selectedCategory.value) return
  router.push({ path: '/table', query: { category: selectedCategory.value } })
}

const handleGoLens = () => router.push('/dict-lens')
const handleGoDrawLens = () => router.push('/draw-kanji')
const handleGoStart = () => {
  window.location.replace('/')
}

// Cuando se carga una nueva lista de estudio (la store ya la guarda), resetear la selección
const handleStudyListUploaded = () => {
  selectedCategory.value = ''
}
</script>

<template>
  <motion.div
    :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }"
    :transition="{ duration: 0.5 }"
    class="flex flex-col gap-8"
  >
    <div class="flex justify-between items-center">
      <motion.div :initial="{ y: -20 }" :animate="{ y: 0 }" :transition="{ duration: 0.5 }">
        <Button variant="outline" @click="handleGoStart">
          <RotateCcw class="mr-2 h-[1.2rem] w-[1.2rem]" />
          START AGAIN
        </Button>
      </motion.div>
      <div class="flex gap-2">
        <ThemeToggle />
        <DataManagement />
        <UploadStudyList @upload="handleStudyListUploaded" />
      </div>
    </div>

    <Card class="bg-secondary/50 backdrop-blur-sm border-primary/20">
      <CardContent class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch">
          <CategoryWheel v-model="selectedCategory" :options="categoryOptions" />

          <div class="flex flex-col gap-6">
            <label class="text-sm text-muted-foreground">Modo de práctica</label>

            <div class="space-y-3">
              <p class="text-sm font-medium">Mostrar:</p>
              <div class="space-y-3 pl-1">
                <div v-for="item in showItems" :key="item.key" class="flex items-center gap-2">
                  <Checkbox
                    :id="`show-${item.key}`"
                    :model-value="showOptions[item.key]"
                    @update:model-value="toggleShow(item.key)"
                  />
                  <Label :for="`show-${item.key}`" class="cursor-pointer">{{ item.label }}</Label>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <p class="text-sm font-medium">Respuesta:</p>
              <RadioGroup v-model="answerOption" class="space-y-3 pl-1">
                <div v-for="item in answerItems" :key="item.key" class="flex items-center gap-2">
                  <RadioGroupItem :id="`answer-${item.key}`" :value="item.key" />
                  <Label :for="`answer-${item.key}`" class="cursor-pointer">{{ item.label }}</Label>
                </div>
              </RadioGroup>
            </div>

            <div class="space-y-2">
              <Label for="timer" class="text-sm font-medium">Temporizador (segundos)</Label>
              <Input
                id="timer"
                type="number"
                :min="5"
                :model-value="timerSeconds"
                class="w-32"
                @update:model-value="timerSeconds = Number($event)"
              />
            </div>

            <div class="flex gap-3">
              <Button
                variant="secondary"
                class="flex-1"
                size="lg"
                :disabled="!selectedCategory"
                @click="handleConsultTable"
              >
                Consult
              </Button>
              <Button
                class="flex-1"
                size="lg"
                :disabled="!selectedCategory || selectedShow.length === 0"
                @click="handleStart"
              >
                Study
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="bg-secondary/50 backdrop-blur-sm border-primary/20">
      <CardContent class="p-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ModeCard
            title="Conversación"
            description="conversación con un asistente de IA"
            icon="💬"
            :is-selected="false"
            @click="router.push('/conversation')"
          />
          <ModeCard
            title="Kanji Lens"
            description="Captura kanjis"
            icon="📷"
            :is-selected="false"
            @click="handleGoLens"
          />
          <ModeCard
            title="Kanji Lens"
            description="Dibuja kanjis"
            icon="✏️"
            :is-selected="false"
            @click="handleGoDrawLens"
          />
        </div>
      </CardContent>
    </Card>

    <div class="text-center text-sm text-muted-foreground mb-16">
      <p>Copyright © All rights reserved | ELNEA 2026</p>
    </div>
  </motion.div>
</template>
