<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import { motion } from 'motion-v'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import ModeCard from '@/components/ModeCard.vue'
import CategoryWheel from '@/components/CategoryWheel.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import LanguageToggle from '@/components/LanguageToggle.vue'
import AppMenu from '@/components/AppMenu.vue'
import { useCategoriesStore } from '@/stores/categories'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
const categoriesStore = useCategoriesStore()

const selectedCategory = ref('')
// Configuración personalizada del modo de práctica. Por defecto: mostrar
// kanji + furigana + audio y validar la respuesta en inglés (equivale al antiguo modo 3).
const showOptions = ref({ audio: true, kanji: true, furigana: true, english: false })
const answerOption = ref('english')
const timerSeconds = ref(45)
// Reproducir el audio de cada tarjeta al cargarla. Se recuerda entre sesiones.
const autoAudio = useLocalStorage('anki-jack-auto-audio', false)

const showItems = [
  { key: 'audio', label: 'dashboard.practice.items.audio' },
  { key: 'kanji', label: 'dashboard.practice.items.kanji' },
  { key: 'furigana', label: 'dashboard.practice.items.furigana' },
  { key: 'english', label: 'dashboard.practice.items.english' },
]
const answerItems = [
  { key: 'japanese', label: 'dashboard.practice.items.japanese' },
  { key: 'english', label: 'dashboard.practice.items.english' },
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
      ...(showOptions.value.audio && autoAudio.value ? { autoplay: '1' } : {}),
    },
  })
}

const handleConsultTable = () => {
  if (!selectedCategory.value) return
  // Las mismas opciones de "Mostrar" deciden qué columnas tiene la tabla
  router.push({
    path: '/table',
    query: { category: selectedCategory.value, show: selectedShow.value.join(',') },
  })
}

const handleGoLens = () => router.push('/dict-lens')
const handleGoDrawLens = () => router.push('/draw-kanji')
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
      <!-- Menú principal: preferencias, datos, navegación y "Acerca de" -->
      <motion.div :initial="{ y: -20 }" :animate="{ y: 0 }" :transition="{ duration: 0.5 }">
        <AppMenu @study-list-uploaded="handleStudyListUploaded" />
      </motion.div>
      <!-- Accesos rápidos (también están en el menú) -->
      <div class="flex gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </div>

    <Card class="bg-secondary/50 backdrop-blur-sm border-primary/20">
      <CardContent class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch">
          <CategoryWheel v-model="selectedCategory" :options="categoryOptions" />

          <div class="flex flex-col gap-6">
            <label class="text-sm text-muted-foreground">{{ t('dashboard.practice.title') }}</label>

            <div class="space-y-3">
              <p class="text-sm font-medium">{{ t('dashboard.practice.show') }}</p>
              <div class="space-y-3 pl-1">
                <div v-for="item in showItems" :key="item.key" class="flex items-center gap-2">
                  <Checkbox
                    :id="`show-${item.key}`"
                    :model-value="showOptions[item.key]"
                    @update:model-value="toggleShow(item.key)"
                  />
                  <Label :for="`show-${item.key}`" class="cursor-pointer">{{ t(item.label) }}</Label>
                  <template v-if="item.key === 'audio' && showOptions.audio">
                    <Checkbox id="show-auto-audio" v-model="autoAudio" class="ml-6" />
                    <Label for="show-auto-audio" class="cursor-pointer">{{ t('dashboard.practice.autoAudio') }}</Label>
                  </template>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <p class="text-sm font-medium">{{ t('dashboard.practice.answer') }}</p>
              <RadioGroup v-model="answerOption" class="space-y-3 pl-1">
                <div v-for="item in answerItems" :key="item.key" class="flex items-center gap-2">
                  <RadioGroupItem :id="`answer-${item.key}`" :value="item.key" />
                  <Label :for="`answer-${item.key}`" class="cursor-pointer">{{ t(item.label) }}</Label>
                </div>
              </RadioGroup>
            </div>

            <div class="space-y-2">
              <Label for="timer" class="text-sm font-medium">{{ t('dashboard.practice.timer') }}</Label>
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
                {{ t('dashboard.practice.consult') }}
              </Button>
              <Button
                class="flex-1"
                size="lg"
                :disabled="!selectedCategory || selectedShow.length === 0"
                @click="handleStart"
              >
                {{ t('dashboard.practice.study') }}
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
            :title="t('dashboard.modes.chat.title')"
            :description="t('dashboard.modes.chat.description')"
            icon="💬"
            :is-selected="false"
            @click="router.push('/avatar-chat')"
          />
          <ModeCard
            :title="t('dashboard.modes.capture.title')"
            :description="t('dashboard.modes.capture.description')"
            icon="📷"
            :is-selected="false"
            @click="handleGoLens"
          />
          <ModeCard
            :title="t('dashboard.modes.draw.title')"
            :description="t('dashboard.modes.draw.description')"
            icon="✏️"
            :is-selected="false"
            @click="handleGoDrawLens"
          />
        </div>
      </CardContent>
    </Card>

    <div class="text-center text-sm text-muted-foreground mb-16">
      <p>{{ t('dashboard.copyright') }}</p>
    </div>
  </motion.div>
</template>
