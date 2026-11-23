<script setup>
/**
 * DrawingCanvas: lienzo para escribir un kanji a mano. Guarda los TRAZOS (no una imagen),
 * que es lo que usan los reconocedores de escritura.
 * Props:
 *  - disabled (Boolean): desactiva el dibujo y los botones.
 * Emits:
 *  - strokes-change(strokes): al terminar, deshacer o borrar un trazo.
 *    strokes: Array<Array<{ x, y, t }>> con x, y normalizados (0..1) y t en ms desde el primer trazo.
 * La cuadrícula guía va en un fondo aparte (CSS): no forma parte del dibujo.
 */
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCcw, Undo2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['strokes-change'])

const canvasRef = useTemplateRef('canvasRef')
const strokes = ref([])
let current = null
let startTime = 0
let ctx = null
let size = 0
let resizeObserver = null

// --- Tamaño (nítido en pantallas de alta densidad) ---

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  size = canvas.clientWidth
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)
  ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}

// --- Dibujo ---

function setStyle() {
  ctx.strokeStyle = getComputedStyle(canvasRef.value).color
  ctx.lineWidth = Math.max(4, size / 45)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function drawStroke(stroke) {
  if (!stroke.length) return
  ctx.beginPath()
  ctx.moveTo(stroke[0].x * size, stroke[0].y * size)
  // Un toque sin movimiento se dibuja como punto
  if (stroke.length === 1) ctx.lineTo(stroke[0].x * size + 0.1, stroke[0].y * size)
  for (const p of stroke.slice(1)) ctx.lineTo(p.x * size, p.y * size)
  ctx.stroke()
}

function redraw() {
  if (!ctx) return
  ctx.clearRect(0, 0, size, size)
  setStyle()
  strokes.value.forEach(drawStroke)
}

function point(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    t: performance.now() - startTime,
  }
}

function onPointerDown(event) {
  if (props.disabled || !event.isPrimary) return
  event.preventDefault()
  canvasRef.value.setPointerCapture(event.pointerId)
  if (!strokes.value.length) startTime = performance.now()
  current = [point(event)]
  setStyle()
  drawStroke(current)
}

function onPointerMove(event) {
  if (!current) return
  event.preventDefault()
  // Con lápiz/táctil el navegador agrupa puntos: se usan todos para un trazo suave
  const events = event.getCoalescedEvents?.() ?? [event]
  const prev = current[current.length - 1]
  for (const e of events) current.push(point(e))
  ctx.beginPath()
  ctx.moveTo(prev.x * size, prev.y * size)
  for (const p of current.slice(-events.length)) ctx.lineTo(p.x * size, p.y * size)
  ctx.stroke()
}

function onPointerUp() {
  if (!current) return
  strokes.value = [...strokes.value, current]
  current = null
  emit('strokes-change', strokes.value)
}

function undo() {
  if (!strokes.value.length) return
  strokes.value = strokes.value.slice(0, -1)
  redraw()
  emit('strokes-change', strokes.value)
}

function clear() {
  strokes.value = []
  redraw()
  emit('strokes-change', strokes.value)
}

defineExpose({ clear })

onMounted(() => {
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvasRef.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div class="flex w-full flex-col items-center gap-3">
    <!-- Cuadrícula guía con CSS (cruz central, como un cuaderno de práctica) -->
    <canvas
      ref="canvasRef"
      class="kanji-grid aspect-square w-full max-w-[420px] cursor-crosshair touch-none rounded-lg border-2 border-border bg-white text-black"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />

    <div class="flex w-full max-w-[420px] justify-between gap-2">
      <Button variant="outline" :disabled="disabled || !strokes.length" @click="undo">
        <Undo2 class="mr-2 h-4 w-4" />
        {{ t('kanji.canvas.undo') }}
      </Button>
      <Button variant="outline" :disabled="disabled || !strokes.length" @click="clear">
        <RotateCcw class="mr-2 h-4 w-4" />
        {{ t('kanji.canvas.clear') }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.kanji-grid {
  background-image:
    linear-gradient(to right, transparent calc(50% - 1px), #d1d5db calc(50% - 1px), #d1d5db calc(50% + 1px), transparent calc(50% + 1px)),
    linear-gradient(to bottom, transparent calc(50% - 1px), #d1d5db calc(50% - 1px), #d1d5db calc(50% + 1px), transparent calc(50% + 1px));
}
</style>
