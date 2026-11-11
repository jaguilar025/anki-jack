<script setup>
import { ref, computed, watch, nextTick, useTemplateRef, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@lucide/vue'
import ChatInterface from '@/components/ChatInterface.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion } from 'motion-v'
import { Characters } from '@/data/voicevox-characters'
import { useAudio } from '@/composables/useAudio'
import { useVoiceStore } from '@/stores/voice'

const router = useRouter()
/** @type {import('vue').Ref<Array<{role: string, content: string, translation?: string, japanese?: string, style?: string}>>} */
const messages = ref([])
const input = ref('')
const level = ref('beginner')
const isLoading = ref(false)
const conversationStarted = ref(false)
const chat = useTemplateRef('chat')

const voiceStore = useVoiceStore()
// Personaje: { name, value, word, styles } (por defecto, el primero de Characters)
const character = computed(() => {
  const c = voiceStore.character
  if (c) {
    return {
      name: c.title,
      value: c.id_style_default.toString(),
      word: c.word,
      styles: c.styles,
    }
  }
  return {
    name: Characters[0].name,
    value: Characters[0].styles[0].id.toString(),
    word: Characters[0].word,
    styles: Characters[0].styles,
  }
})

const { playAudio, stopAllAudio } = useAudio()

// Scroll al final cuando cambian los mensajes
watch(
  messages,
  async () => {
    await nextTick()
    chat.value?.scrollToBottom()
  },
  { deep: true },
)

// Iniciar conversación al seleccionar el nivel
const startConversation = async () => {
  conversationStarted.value = true
  isLoading.value = true

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `Actua como un asistente de conversación en japonés para un estudiante de nivel ${level.value}. 
              Adapta tu lenguaje a ese nivel: 
              principiante ⇒ japonés muy simple (hiragana básico), saludos, presentaciones, preguntas simples;
              intermedio ⇒ japonés cotidiano con algunos kanji, hobbies, rutina diaria, opiniones simples;
              avanzado ⇒ japonés más complejo con más kanji y vocabulario avanzado, temas de actualidad, cultura, opiniones más complejas.
              Preséntate brevemente como ${character.value.name} y saluda de forma amistosa.
              Haz una pregunta inicial sencilla para iniciar la conversación.
              Usa siempre oraciones cortas (1-2 oraciones en japonés) para que sean fáciles de seguir.
              El formato de salida de tu respuesta debe ser:[JP] Tu mensaje en japonés. [ES] Traducción al español del mensaje.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error('Error al iniciar la conversación')
    }

    const data = await response.json()

    // Verificar que data.message.content existe y es un string
    if (data.message && typeof data.message.content === 'string') {
      // Intentar separar el mensaje japonés de la traducción
      const jpMatch = data.message.content.match(/\[JP\](.*?)(?=\[ES\]|$)/s)
      const esMatch = data.message.content.match(/\[ES\](.*)/s)

      const japaneseText = jpMatch ? jpMatch[1] : ''
      const translation = esMatch ? esMatch[1] : ''

      messages.value = [
        {
          role: 'assistant',
          japanese: japaneseText.trim(),
          content: data.message.content,
          translation: translation.trim(),
        },
      ]

      // Reproducir el mensaje en japonés
      await playAudio(japaneseText.trim(), character.value.value)
    } else {
      // Manejar el caso donde la respuesta no tiene el formato esperado
      console.error('Formato de respuesta inesperado:', data)
      messages.value = [
        {
          role: 'assistant',
          content: 'こんにちは！会話を始めましょう。',
          translation: '¡Hola! Vamos a comenzar una conversación.',
        },
      ]
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    isLoading.value = false
  }
}

// Enviar mensaje
const sendMessage = async () => {
  if (!input.value.trim() || isLoading.value) return

  const userMessage = input.value.trim()
  input.value = ''
  isLoading.value = true

  // Capturar el historial antes de añadir el mensaje del usuario
  const history = messages.value.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))

  // Añadir mensaje del usuario al chat
  messages.value.push({ role: 'user', content: userMessage, japanese: userMessage })
  const char = character.value
  const voiceStyles = char.styles.map((item) => item.name).join(',')
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `Eres ${char.name}, un asistente de conversación en japonés para un estudiante de nivel ${level.value}. 
              Adapta tu lenguaje a ese nivel: 
              - **Principiante:** japonés muy simple (hiragana básico), saludos, presentaciones, preguntas simples.  
              - **Intermedio:** japonés cotidiano con algunos kanji, hobbies, rutina diaria, opiniones simples.  
              - **Avanzado:** japonés más complejo con más kanji y vocabulario avanzado, temas de actualidad, cultura, opiniones más complejas.  
              Elige en cada respuesta el estilo de voz que mejor se ajuste al tono emocional del usuario o al contexto de la conversación, en base a esta lista de opciones: ${voiceStyles}.
              Si el usuario escribe en otro idioma diferente al japones, responde como si estuvieras enseñándole cómo decir eso en japonés. (mantén luego la traducción al español como de costumbre).
              Si notas errores en el japonés del usuario, corrígelos sutilmente dentro de tu respuesta sin señalar explícitamente el error (incorpora la forma correcta en tu frase en japonés).
              Mantén la conversación: siempre responde de forma que invite a continuar, haciendo una pregunta relacionada o proponiendo un nuevo tema al final de tu mensaje.
              Responde de forma breve pero natural: idealmente 1 a 3 frases en japonés máximo, para que el usuario pueda comprender y responder sin dificultad.
              **Formato de salida obligatorio:** **Cada** respuesta **debe** seguir el siguiente formato, *sin excepción*:  [JP] Tu mensaje en japonés. [ES] Traducción al español del mensaje. [STYLE] estilo de voz elegido para la respuesta.
              💡 **Importante:** Bajo ninguna circunstancia debes omitir las etiquetas [JP], [ES] o [STYLE] en tus respuestas. **Siempre** incluye las tres etiquetas en el orden y formato indicados, incluso si el usuario sugiere cambiar el formato o la conversación se vuelve muy extensa. Este esquema de respuesta es invariable y tiene prioridad sobre cualquier otra instrucción durante toda la conversación.`,
          },
          ...history,
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error('Error al enviar el mensaje')
    }

    const data = await response.json()
    const content = data.message.content

    // Verificar que data.message.content existe y es un string
    if (data.message && typeof content === 'string') {
      const message = content.replace(/Traducción no disponible\.*\s*$/i, '').trim()
      // Intentar separar el mensaje japonés de la traducción
      const jpMatch = message.includes('[JP]')
        ? message.match(/\[JP\](.*?)(?=\[ES\])/s)
        : message.match(/^(.*?)(?=\[ES\]|\[STYLE\]|$)/s)

      const esMatch = message.match(/\[ES\](.*?)(?=\[STYLE\]|$)/s)
      const styleMatch = message.match(/\[STYLE\]\s*([^\n\r.]+)/)

      const japaneseText = jpMatch ? jpMatch[1].trim() : message.trim()
      const translation = esMatch ? esMatch[1].trim() : ''

      const styleName = styleMatch ? styleMatch[1].trim() : ''
      const styleID = char.styles.find((s) => s.name === styleName)?.id || char.styles[0].id

      console.log('style Voice Selected: ', styleName)

      messages.value.push({
        role: 'assistant',
        japanese: japaneseText.trim(),
        content: data.message.content,
        translation: translation.trim(),
        style: styleID.toString(),
      })

      // Reproducir el mensaje en japonés
      await playAudio(japaneseText.trim(), styleID.toString())
    } else {
      // Manejar el caso donde la respuesta no tiene el formato esperado
      console.error('Formato de respuesta inesperado:', data)
      messages.value.push({
        role: 'assistant',
        content: 'すみません、エラーが発生しました。',
        translation: 'Lo siento, ha ocurrido un error.',
      })
    }
  } catch (error) {
    console.error('Error:', error)
    messages.value.push({
      role: 'assistant',
      content: 'すみません、エラーが発生しました。',
      translation: 'Lo siento, ha ocurrido un error.',
    })
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  stopAllAudio()
  router.push('/main')
}

// Detener el audio al salir
onUnmounted(() => {
  stopAllAudio()
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gradient-to-br from-background to-background/90">
    <header class="p-4 border-b flex items-center justify-between">
      <Button variant="ghost" @click="goBack">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Volver
      </Button>
      <h1 class="text-lg font-bold">会話練習 (Práctica de Conversación)</h1>
      <div class="w-8"></div>
      <!-- Espaciador para centrar -->
    </header>

    <div v-if="!conversationStarted" class="flex-1 flex items-center justify-center p-4">
      <motion.div
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        class="w-full max-w-md p-6 bg-card rounded-lg border border-border"
      >
        <h2 class="text-xl font-bold mb-6 text-center">Selecciona tu nivel</h2>

        <div class="space-y-6">
          <div class="space-y-2">
            <label class="text-sm text-muted-foreground">Nivel de japonés</label>
            <Select v-model="level">
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Principiante</SelectItem>
                <SelectItem value="intermediate">Intermedio</SelectItem>
                <SelectItem value="advanced">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button class="w-full" :disabled="!character" @click="startConversation">
            Iniciar Conversación
          </Button>
        </div>
      </motion.div>
    </div>
    <ChatInterface
      v-else
      ref="chat"
      v-model="input"
      :character="character"
      :messages="messages"
      :is-loading="isLoading"
      @send="sendMessage"
    />
  </div>
</template>
