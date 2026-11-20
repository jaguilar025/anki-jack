import { ref, computed } from 'vue'
import { Characters } from '@/data/voicevox-characters'
import { useAudio } from '@/composables/useAudio'
import { useVoiceStore } from '@/stores/voice'
import { EMOTION_NAMES } from '@/components/avatar/vrm/expression'

// Lista para el prompt; la IA elige una por respuesta para la cara del avatar
const EMOTIONS_PROMPT = EMOTION_NAMES.join(', ')

/** Emoción válida de la respuesta ([EMOTION] happy) o null. */
function parseEmotion(text) {
  const name = text.match(/\[EMOTION\]\s*([a-zA-Z]+)/)?.[1]?.toLowerCase()
  return EMOTION_NAMES.includes(name) ? name : null
}

const ERROR_MESSAGE = {
  role: 'assistant',
  content: 'すみません、エラーが発生しました。',
  translation: 'Lo siento, ha ocurrido un error.',
}

/**
 * Lógica de la práctica de conversación: historial, llamadas a /api/chat y voz.
 * @param {object} [options]
 * @param {(audio: HTMLAudioElement) => void | Promise<void>} [options.onAudio]
 *   Se pasa a useAudio (p. ej. para el lip-sync del avatar).
 * @param {(emotion: string, opts?: { resetAfter?: number }) => void} [options.onEmotion]
 *   Emoción de cada respuesta: se llama al empezar a sonar la frase y con 'neutral' al terminar.
 */
export function useConversation({ onAudio, onEmotion } = {}) {
  /** @type {import('vue').Ref<Array<{role: string, content: string, translation?: string, japanese?: string, style?: string}>>} */
  const messages = ref([])
  const input = ref('')
  const level = ref('beginner')
  const isLoading = ref(false)
  const conversationStarted = ref(false)

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

  // Emoción de la respuesta que está por sonar
  let pendingEmotion = null

  const handleAudio = async (audio) => {
    if (pendingEmotion && onEmotion) {
      const emotion = pendingEmotion
      pendingEmotion = null
      // Dura lo que dura la frase
      audio.addEventListener('play', () => onEmotion(emotion, { resetAfter: 0 }), { once: true })
      for (const ev of ['ended', 'pause', 'error']) {
        audio.addEventListener(ev, () => onEmotion('neutral'), { once: true })
      }
    }
    await onAudio?.(audio)
  }

  const { playAudio, stopAllAudio, isSpeaking } = useAudio({ onAudio: handleAudio })

  /** Reproduce la frase y aplica su emoción mientras suena. */
  const speak = async (text, speaker, emotion) => {
    pendingEmotion = emotion
    await playAudio(text, speaker)
    // Sin audio propio (voz del navegador): emoción por unos segundos
    if (pendingEmotion) onEmotion?.(pendingEmotion, { resetAfter: 4000 })
    pendingEmotion = null
  }

  // Iniciar conversación al seleccionar el nivel
  const startConversation = async () => {
    conversationStarted.value = true
    isLoading.value = true

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              Elige también la emoción que mejor refleje tu mensaje, de esta lista: ${EMOTIONS_PROMPT}.
              El formato de salida de tu respuesta debe ser:[JP] Tu mensaje en japonés. [ES] Traducción al español del mensaje. [EMOTION] emoción elegida.`,
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
        const esMatch = data.message.content.match(/\[ES\](.*?)(?=\[STYLE\]|\[EMOTION\]|$)/s)
        const emotion = parseEmotion(data.message.content)

        const japaneseText = jpMatch ? jpMatch[1] : ''
        const translation = esMatch ? esMatch[1] : ''

        messages.value = [
          {
            role: 'assistant',
            japanese: japaneseText.trim(),
            content: data.message.content,
            translation: translation.trim(),
            emotion,
          },
        ]

        // Reproducir el mensaje en japonés
        await speak(japaneseText.trim(), character.value.value, emotion)
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
        headers: { 'Content-Type': 'application/json' },
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
              Elige también la emoción que mejor refleje tu respuesta, en base a esta lista: ${EMOTIONS_PROMPT}.
              Si el usuario escribe en otro idioma diferente al japones, responde como si estuvieras enseñándole cómo decir eso en japonés. (mantén luego la traducción al español como de costumbre).
              Si notas errores en el japonés del usuario, corrígelos sutilmente dentro de tu respuesta sin señalar explícitamente el error (incorpora la forma correcta en tu frase en japonés).
              Mantén la conversación: siempre responde de forma que invite a continuar, haciendo una pregunta relacionada o proponiendo un nuevo tema al final de tu mensaje.
              Responde de forma breve pero natural: idealmente 1 a 3 frases en japonés máximo, para que el usuario pueda comprender y responder sin dificultad.
              **Formato de salida obligatorio:** **Cada** respuesta **debe** seguir el siguiente formato, *sin excepción*:  [JP] Tu mensaje en japonés. [ES] Traducción al español del mensaje. [STYLE] estilo de voz elegido para la respuesta. [EMOTION] emoción elegida para la respuesta.
              💡 **Importante:** Bajo ninguna circunstancia debes omitir las etiquetas [JP], [ES], [STYLE] o [EMOTION] en tus respuestas. **Siempre** incluye las cuatro etiquetas en el orden y formato indicados, incluso si el usuario sugiere cambiar el formato o la conversación se vuelve muy extensa. Este esquema de respuesta es invariable y tiene prioridad sobre cualquier otra instrucción durante toda la conversación.`,
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
          : message.match(/^(.*?)(?=\[ES\]|\[STYLE\]|\[EMOTION\]|$)/s)

        const esMatch = message.match(/\[ES\](.*?)(?=\[STYLE\]|\[EMOTION\]|$)/s)
        // Sin '[' para no comerse la etiqueta [EMOTION] si viene en la misma línea
        const styleMatch = message.match(/\[STYLE\]\s*([^\n\r.[]+)/)
        const emotion = parseEmotion(message)

        const japaneseText = jpMatch ? jpMatch[1].trim() : message.trim()
        const translation = esMatch ? esMatch[1].trim() : ''

        const styleName = styleMatch ? styleMatch[1].trim() : ''
        const styleID = char.styles.find((s) => s.name === styleName)?.id || char.styles[0].id

        console.log('style Voice Selected: ', styleName, '| emotion:', emotion)

        messages.value.push({
          role: 'assistant',
          japanese: japaneseText.trim(),
          content: data.message.content,
          translation: translation.trim(),
          style: styleID.toString(),
          emotion,
        })

        // Reproducir el mensaje en japonés
        await speak(japaneseText.trim(), styleID.toString(), emotion)
      } else {
        // Manejar el caso donde la respuesta no tiene el formato esperado
        console.error('Formato de respuesta inesperado:', data)
        messages.value.push({ ...ERROR_MESSAGE })
      }
    } catch (error) {
      console.error('Error:', error)
      messages.value.push({ ...ERROR_MESSAGE })
    } finally {
      isLoading.value = false
    }
  }

  return {
    messages,
    input,
    level,
    isLoading,
    conversationStarted,
    character,
    isSpeaking,
    startConversation,
    sendMessage,
    stopAllAudio,
    speak,
  }
}
