<script setup>
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, PenTool } from '@lucide/vue'
import DrawingCanvas from '@/components/DrawingCanvas.vue'
import KanjiInfo from '@/components/KanjiInfo.vue'

const capturedImage = ref(null)
const isProcessing = ref(false)
/** Datos del kanji: { code, kanji, onyomi, kunyomi, meaning, url, gif, strokes, vocabulary: [{ jp, pron, en }] } */
const kanjiResult = ref(null)
const error = ref(null)

const processImage = async (imageData) => {
  isProcessing.value = true
  error.value = null
  capturedImage.value = imageData

  try {
    const response = await fetch('/api/process-kanji', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    })

    if (!response.ok) {
      let errorMessage = 'Error procesando la imagen'
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        errorMessage = `Error ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()

    if (!result.kanji) {
      throw new Error('No se recibió información del kanji')
    }

    kanjiResult.value = result.kanji
  } catch (err) {
    console.error('Error processing image:', err)
    let errorMessage = 'Error procesando la imagen'

    if (err instanceof Error) {
      errorMessage = err.message
    }

    // Casos de error específicos
    if (errorMessage.includes('API key')) {
      errorMessage = 'Error de configuración: API key de OpenAI no válida'
    } else if (errorMessage.includes('quota')) {
      errorMessage = 'Límite de API excedido. Intenta más tarde.'
    } else if (errorMessage.includes('not found')) {
      errorMessage = 'No se pudo identificar el kanji en la imagen'
    } else if (errorMessage.includes('database')) {
      errorMessage = 'Error en la base de datos de kanji'
    }

    // En desarrollo, mostrar más detalles
    if (import.meta.env.DEV) {
      errorMessage += ` (Debug: ${err instanceof Error ? err.message : String(err)})`
    }

    error.value = errorMessage
  } finally {
    isProcessing.value = false
  }
}

const resetDrawing = () => {
  capturedImage.value = null
  kanjiResult.value = null
  error.value = null
}
</script>

<template>
  <KanjiInfo v-if="kanjiResult" :kanji-result="kanjiResult" @new-search="resetDrawing" />

  <div
    v-else
    class="min-h-screen bg-black relative overflow-hidden flex flex-col justify-center items-center p-2"
  >
    <!-- Header -->
    <div class="top-4 z-10 w-full mb-8 p-0">
      <RouterLink to="/main">
        <Button variant="ghost" size="sm" class="text-white hover:bg-white/20">
          <ArrowLeft class="mr-2 h-4 w-4" />
          Inicio
        </Button>
      </RouterLink>
    </div>

    <!-- Contenido principal -->
    <Card class="h-[100vh] w-full flex flex-col">
      <CardHeader class="text-center pb-4 shrink-0">
        <CardTitle class="flex items-center justify-center gap-2 text-lg">
          <PenTool class="h-5 w-5" />
          Dibuja un kanji en el lienzo
        </CardTitle>
      </CardHeader>

      <CardContent v-if="!capturedImage" class="w-full flex-grow py-6">
        <DrawingCanvas :disabled="isProcessing" @image-capture="processImage" />
      </CardContent>
      <CardContent v-else class="w-full flex-grow py-6">
        <div class="text-center mb-4">
          <img
            :src="capturedImage"
            alt="Kanji dibujado"
            class="w-full max-w-xs mx-auto rounded-lg border"
          />
        </div>

        <div v-if="isProcessing" class="text-center">
          <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2" />
          <p class="text-gray-600">Procesando dibujo...</p>
        </div>

        <div v-if="error" class="text-center">
          <p class="text-red-600 mb-4">{{ error }}</p>
          <Button variant="outline" class="w-full" @click="resetDrawing">Intentar de nuevo</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
