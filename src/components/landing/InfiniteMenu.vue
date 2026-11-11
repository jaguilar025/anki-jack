<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SquareArrowOutUpRight } from '@lucide/vue'
import { useAudio } from '@/composables/useAudio'
import { useVoiceStore } from '@/stores/voice'
import { InfiniteGridMenu, defaultItems } from './infinite-menu-gl.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const router = useRouter()
const voiceStore = useVoiceStore()
const { playAudio } = useAudio()

const canvasRef = useTemplateRef('canvasRef')
const activeItem = ref(null)
const isMoving = ref(false)
const activeItemPosition = ref({ x: 0, y: 0 })
const canvasSize = ref({ width: 0, height: 0 })
let hasLoggedItem = false
let hasLoggedItemFirstTime = false
let sketch = null

async function handleSelectedItem(item) {
  await playAudio(item.word, item.id_style_default.toString())
  voiceStore.setVoice(item.id_style_default.toString())
}

function handleActiveItem(index) {
  const itemIndex = index % props.items.length
  activeItem.value = props.items[itemIndex]
}

function handleMovementChange(moving) {
  isMoving.value = moving
  if (moving) hasLoggedItem = false // Reiniciar cuando empieza el movimiento
}

function handleItemLog(item) {
  if (!hasLoggedItem) {
    handleSelectedItem(item)
    hasLoggedItem = true // Evita más registros hasta que haya movimiento
  }
}

function updateCanvasSize() {
  const canvas = canvasRef.value
  if (canvas) {
    canvasSize.value = { width: canvas.clientWidth, height: canvas.clientHeight }
  }
}

function handleResize() {
  if (sketch) sketch.resize()
  updateCanvasSize()
}

function initSketch() {
  const canvas = canvasRef.value
  if (!canvas) return
  if (sketch) sketch.destroy()
  sketch = new InfiniteGridMenu(
    canvas,
    props.items.length ? props.items : defaultItems,
    handleActiveItem,
    handleMovementChange,
    (sk) => sk.run(),
    (position) => { activeItemPosition.value = position },
    handleItemLog,
  )
  handleResize()
}

onMounted(() => {
  initSketch()
  window.addEventListener('resize', handleResize)
})

watch(() => props.items, () => {
  if (canvasRef.value && sketch) initSketch()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (sketch) sketch.destroy()
  sketch = null
})

// Primera selección
watch(activeItem, (item) => {
  if (item && !hasLoggedItem && !hasLoggedItemFirstTime) {
    handleSelectedItem(item)
    hasLoggedItemFirstTime = true
  }
})

function handleButtonClick() {
  const link = activeItem.value?.link
  if (!link) return
  if (link.startsWith('/')) router.push(link)
  else window.location.href = link
}

// Offsets en porcentaje (responsive)
const isMobile = computed(() => canvasSize.value.width < 640)
const isMediumScreen = computed(() => canvasSize.value.width < 1400)
const baseOffsetX = computed(() => (isMobile.value ? 4 : isMediumScreen.value ? 28 : 18))
const baseOffsetY = computed(() => (isMobile.value ? 25 : 23))
const minOffsetPx = computed(() => (isMobile.value ? -10 : 0))

const itemXPercent = computed(() => (activeItemPosition.value.x / canvasSize.value.width) * 100)
const itemYPercent = computed(() => (activeItemPosition.value.y / canvasSize.value.height) * 100)

const titleStyle = computed(() => ({
  position: 'absolute',
  left: `calc(${itemXPercent.value}% - ${baseOffsetX.value}% - ${minOffsetPx.value}px - 150px)`,
  top: `calc(${itemYPercent.value}% - ${baseOffsetY.value}% - ${minOffsetPx.value}px)`,
  zIndex: 10,
  fontSize: '40px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'start',
  gap: '12px',
}))

const descriptionStyle = computed(() => ({
  position: 'absolute',
  left: `calc(${itemXPercent.value}% + ${baseOffsetX.value}% + ${minOffsetPx.value}px)`,
  top: `calc(${itemYPercent.value}% + ${baseOffsetY.value}% + ${minOffsetPx.value}px)`,
  zIndex: 10,
  fontSize: '24px',
}))
</script>

<template>
  <div class="fixed w-screen h-screen top-0 left-0 m-0 p-0 overflow-hidden">
    <canvas
      id="infinite-grid-menu-canvas"
      ref="canvasRef"
      class="cursor-grab w-full h-full overflow-hidden relative outline-none active:cursor-grabbing"
    />

    <template v-if="activeItem">
      <!-- Título -->
      <h2
        :style="titleStyle"
        :class="[
          'cursor-pointer select-none absolute font-black left-[100px] top-1/2 transform -translate-y-1/2 transition-all ease-[cubic-bezier(0.25,0.1,0.25,1.0)]',
          isMoving
            ? 'opacity-0 pointer-events-none duration-[100ms]'
            : 'opacity-100 pointer-events-auto duration-[500ms]',
        ]"
        @click="handleButtonClick"
      >
        {{ activeItem.title }}
        <span class="mt-4"><SquareArrowOutUpRight :size="24" /></span>
      </h2>

      <!-- Descripción -->
      <p
        :style="descriptionStyle"
        :class="[
          'select-none absolute max-w-[10ch] text-xl right-0 top-1/2 transform -translate-y-1/2 !pr-[16px] transition-all ease-[cubic-bezier(0.25,0.1,0.25,1.0)]',
          isMoving
            ? 'opacity-0 pointer-events-none duration-[100ms] translate-x-[-60%] -translate-y-1/2'
            : 'opacity-100 pointer-events-auto duration-[500ms] translate-x-[-90%] -translate-y-1/2',
        ]"
      >
        {{ activeItem.description }}
      </p>
    </template>
  </div>
</template>
