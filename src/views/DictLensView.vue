<script setup>
import { ref, watch, nextTick, useTemplateRef, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, ArrowLeft, Loader2 } from '@lucide/vue'
import KanjiInfo from '@/components/KanjiInfo.vue'

const isMobile = ref(null)
let stream = null
const hasStream = ref(false)
const capturedImage = ref(null)
const isProcessing = ref(false)
/** Datos del kanji: { code, kanji, onyomi, kunyomi, meaning, url, gif, strokes, vocabulary: [{ jp, pron, en }] } */
const kanjiResult = ref(null)
const error = ref(null)

const videoRef = useTemplateRef('videoRef')
const canvasRef = useTemplateRef('canvasRef')

const stopStream = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  hasStream.value = false
}

const checkMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']
  const isMobileDevice =
    mobileKeywords.some((keyword) => userAgent.includes(keyword)) || window.innerWidth <= 768
  console.log('Is mobile:', isMobileDevice, 'User Agent:', userAgent, 'Window width:', window.innerWidth)
  return isMobileDevice
}

const checkCameraPermission = async () => {
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'camera' })
    if (permissionStatus.state === 'denied') {
      error.value = 'El acceso a la cámara está denegado. Habilita los permisos en la configuración.'
      return false
    }
    return true
  } catch (err) {
    console.error('Error checking camera permission:', err)
    return true
  }
}

const attachStream = async () => {
  await nextTick()
  if (videoRef.value && stream) {
    videoRef.value.srcObject = stream
    videoRef.value.play().catch((err) => {
      console.error('Error playing video:', err)
      error.value = 'No se pudo reproducir el video de la cámara'
    })
  }
}

const startCamera = async () => {
  const hasPermission = await checkCameraPermission()
  if (!hasPermission) return

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })

    stopStream()
    stream = mediaStream
    hasStream.value = true
    attachStream()
  } catch (err) {
    console.error('Error accessing camera:', err)
    error.value = 'No se pudo acceder a la cámara. Asegúrate de que los permisos estén habilitados.'
  }
}

onMounted(() => {
  isMobile.value = checkMobile()
})

watch(isMobile, (value) => {
  if (value) startCamera()
})

onUnmounted(stopStream)

const processImage = async (imageData) => {
  isProcessing.value = true
  error.value = null

  try {
    const response = await fetch('/api/process-kanji', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Error procesando la imagen')
    }

    kanjiResult.value = result.kanji
  } catch (err) {
    console.error('Error processing image:', err)
    error.value = err instanceof Error ? err.message : 'Error procesando la imagen'
  } finally {
    isProcessing.value = false
  }
}

const capturePhoto = () => {
  if (!videoRef.value || !canvasRef.value) {
    error.value = 'No se pudo capturar la imagen. La cámara no está lista.'
    return
  }

  const video = videoRef.value
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    error.value = 'No se pudo obtener el contexto del lienzo.'
    return
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  if (canvas.width === 0 || canvas.height === 0) {
    error.value = 'La cámara no está lista para capturar la imagen.'
    return
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
  capturedImage.value = imageDataUrl

  stopStream()

  processImage(imageDataUrl)
}

const resetCamera = () => {
  capturedImage.value = null
  kanjiResult.value = null
  error.value = null
  if (isMobile.value) {
    startCamera()
  }
}
</script>

<template>
  <div v-if="isMobile === null" class="min-h-screen bg-black flex items-center justify-center">
    <Loader2 class="h-8 w-8 animate-spin text-white" />
  </div>

  <div
    v-else-if="!isMobile"
    class="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4"
  >
    <Card class="w-full max-w-md">
      <CardContent class="p-8 text-center">
        <div class="text-red-500 mb-4">
          <Camera class="mx-auto h-16 w-16" />
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-4">Aplicación no soportada en PC</h2>
        <p class="text-gray-600 mb-6">
          Esta aplicación requiere una cámara móvil para funcionar correctamente. Por favor, accede
          desde un dispositivo móvil.
        </p>
        <RouterLink to="/">
          <Button variant="outline" class="w-full">
            <ArrowLeft class="mr-2 h-4 w-4" />
            Volver al inicio
          </Button>
        </RouterLink>
      </CardContent>
    </Card>
  </div>

  <KanjiInfo v-else-if="kanjiResult" :kanji-result="kanjiResult" @new-search="resetCamera" />

  <div v-else class="min-h-screen bg-black relative overflow-hidden">
    <div class="absolute top-4 left-4 z-10">
      <RouterLink to="/main">
        <Button variant="ghost" size="sm" class="text-white hover:bg-white/20">
          <ArrowLeft class="mr-2 h-4 w-4" />
          Inicio
        </Button>
      </RouterLink>
    </div>

    <template v-if="hasStream && !capturedImage">
      <video ref="videoRef" autoplay playsinline muted class="w-full h-full object-contain" />

      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="relative">
          <div class="w-32 h-32 border-2 border-white/70 rounded-lg"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-8 h-0.5 bg-white/70"></div>
          </div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-0.5 h-8 bg-white/70"></div>
          </div>
        </div>
      </div>

      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          size="lg"
          class="bg-white text-black hover:bg-gray-200 rounded-full w-16 h-16 p-0"
          @click="capturePhoto"
        >
          <Camera class="h-6 w-6" />
        </Button>
      </div>
    </template>

    <div v-if="capturedImage" class="w-full h-full flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        <img :src="capturedImage" alt="Captured kanji" class="w-full rounded-lg mb-4" />

        <div v-if="isProcessing" class="text-center text-white">
          <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Procesando imagen...</p>
        </div>

        <div v-if="error" class="text-center">
          <p class="text-red-400 mb-4">{{ error }}</p>
          <Button class="bg-white text-black" @click="resetCamera">Intentar de nuevo</Button>
        </div>
      </div>
    </div>

    <canvas ref="canvasRef" class="hidden" />
  </div>
</template>
