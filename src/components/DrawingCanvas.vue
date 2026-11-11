<script setup>
/**
 * DrawingCanvas
 * Props:
 *  - disabled (Boolean, default false): desactiva el dibujo y los botones.
 * Emits:
 *  - image-capture(imageData: string): data URL JPEG (calidad 0.8) al pulsar "Confirmar dibujo".
 *    (React: onImageCapture -> padre usa @image-capture="fn")
 */
import { onMounted, useTemplateRef } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCcw } from '@lucide/vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['image-capture'])

const canvasRef = useTemplateRef('canvasRef')
let isDrawing = false
let context = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Tamaño del canvas
  const container = canvas.parentElement
  if (container) {
    const size = Math.min(container.clientWidth, container.clientHeight) * 0.9
    canvas.width = size
    canvas.height = size
  }

  // Configurar contexto de dibujo
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Fondo blanco
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawGrid(ctx, canvas.width, canvas.height)

  context = ctx
})

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 1

  const gridSize = 20
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Líneas centrales (más gruesas)
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  // Restablecer estilo para dibujar
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 4
}

function getCoordinates(event) {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }

  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  if (event instanceof MouseEvent) {
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }
  const touch = event.touches[0] || event.changedTouches[0]
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  }
}

function startDrawing(event) {
  if (props.disabled || !context) return

  event.preventDefault()
  isDrawing = true

  const { x, y } = getCoordinates(event)
  context.beginPath()
  context.moveTo(x, y)
}

function draw(event) {
  if (!isDrawing || props.disabled || !context) return

  event.preventDefault()
  const { x, y } = getCoordinates(event)
  context.lineTo(x, y)
  context.stroke()
}

function stopDrawing() {
  isDrawing = false
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !context) return

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  drawGrid(context, canvas.width, canvas.height)
}

function captureDrawing() {
  const canvas = canvasRef.value
  if (!canvas) return

  emit('image-capture', canvas.toDataURL('image/jpeg', 0.8))
}
</script>

<template>
  <div class="flex flex-col items-center w-full">
    <div class="flex items-center justify-center w-full">
      <canvas
        ref="canvasRef"
        class="border-2 border-gray-300 rounded-lg cursor-crosshair touch-none"
        :style="{ minWidth: '100%', minHeight: '100%' }"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseout="stopDrawing"
        @touchstart="startDrawing"
        @touchmove="draw"
        @touchend="stopDrawing"
      />
    </div>

    <div class="flex flex-row justify-between w-full mt-20 mb-2">
      <Button variant="outline" :disabled="disabled" @click="clearCanvas">
        <RotateCcw class="mr-2 h-4 w-4" />
        Limpiar
      </Button>
      <Button :disabled="disabled" @click="captureDrawing">
        Confirmar dibujo
      </Button>
    </div>
  </div>
</template>
