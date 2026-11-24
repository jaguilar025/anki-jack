import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { Characters } from '@/data/voicevox-characters'
import { useAudio } from '@/composables/useAudio'
import { useVoiceStore } from '@/stores/voice'
import { EMOTION_NAMES } from '@/components/avatar/vrm/expression'
import {
  LESSONS,
  buildGrammarContext,
  buildReplyPrompt,
  buildStartPrompt,
  explainGrammarMessage,
} from '@/lib/conversationPrompt'

// Lista para el prompt; la IA elige una por respuesta para la cara del avatar
const EMOTIONS_PROMPT = EMOTION_NAMES.join(', ')

const ERROR_MESSAGE = {
  role: 'assistant',
  content: 'すみません、エラーが発生しました。',
  japanese: 'すみません、エラーが発生しました。',
  translation: 'Sorry, something went wrong.',
}

/**
 * Separa la respuesta de la IA: [JP] japonés [EN] traducción [STYLE] estilo [EMOTION] emoción.
 * Acepta también [ES] (formato anterior) como traducción.
 */
export function parseAssistantMessage(content) {
  const message = content.replace(/Traducción no disponible\.*\s*$/i, '').trim()
  const tag = '(?=\\[(?:EN|ES|STYLE|EMOTION)\\]|$)'
  const japanese = message.includes('[JP]')
    ? message.match(new RegExp(`\\[JP\\](.*?)${tag}`, 's'))?.[1]
    : message.match(new RegExp(`^(.*?)${tag}`, 's'))?.[1]
  const translation = message.match(/\[(?:EN|ES)\](.*?)(?=\[STYLE\]|\[EMOTION\]|$)/s)?.[1]
  // Sin '[' para no comerse la etiqueta [EMOTION] si viene en la misma línea
  const style = message.match(/\[STYLE\]\s*([^\n\r.[]+)/)?.[1]?.trim() ?? ''
  const emotionName = message.match(/\[EMOTION\]\s*([a-zA-Z]+)/)?.[1]?.toLowerCase()
  return {
    japanese: (japanese ?? message).trim(),
    translation: (translation ?? '').trim(),
    style,
    emotion: EMOTION_NAMES.includes(emotionName) ? emotionName : null,
  }
}

/**
 * Lógica de la práctica de conversación (nivel 初中級 / N4 por lecciones): historial, llamadas a
 * /api/chat y voz.
 * @param {object} [options]
 * @param {(audio: HTMLAudioElement) => void | Promise<void>} [options.onAudio]
 *   Se pasa a useAudio (p. ej. para el lip-sync del avatar).
 * @param {(emotion: string, opts?: { resetAfter?: number }) => void} [options.onEmotion]
 *   Emoción de cada respuesta: se llama al empezar a sonar la frase y con 'neutral' al terminar.
 * @param {(text: string) => boolean} [options.onCommand]
 *   Se llama con cada mensaje antes de enviarlo a la IA; si devuelve true, el mensaje era un
 *   comando (p. ej. "dance go wild") y no se envía ni se agrega al historial.
 */
export function useConversation({ onAudio, onEmotion, onCommand } = {}) {
  /** @type {import('vue').Ref<Array<{role: string, content: string, translation?: string, japanese?: string, style?: string}>>} */
  const messages = ref([])
  const input = ref('')
  const isLoading = ref(false)
  const conversationStarted = ref(false)

  /** Lección elegida (1..15); se recuerda entre sesiones */
  const lesson = useLocalStorage('conversation-lesson', 1)
  /** Punto de gramática enfocado { st, grammar } o null (= toda la lección) */
  const focus = ref(null)
  const lessonData = computed(() => LESSONS.find((l) => l.lesson === lesson.value) ?? LESSONS[0])
  const grammarContext = computed(() => buildGrammarContext(lesson.value, focus.value))

  // El foco pertenece a la lección: al cambiarla se quita
  watch(lesson, () => (focus.value = null))

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

  // Sin caché: en una conversación casi nunca se repite la misma frase
  const { playAudio, stopAllAudio, isSpeaking } = useAudio({ onAudio: handleAudio, cache: false })

  /** Reproduce la frase y aplica su emoción mientras suena. */
  const speak = async (text, speaker, emotion) => {
    pendingEmotion = emotion
    await playAudio(text, speaker)
    // Sin audio propio (voz del navegador): emoción por unos segundos
    if (pendingEmotion) onEmotion?.(pendingEmotion, { resetAfter: 4000 })
    pendingEmotion = null
  }

  async function callChat(messagesPayload) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messagesPayload }),
    })
    if (!response.ok) throw new Error(`Error ${response.status} en /api/chat`)
    const data = await response.json()
    if (typeof data?.message?.content !== 'string') throw new Error('Formato de respuesta inesperado')
    return data.message.content
  }

  // Iniciar conversación: saludo del avatar según la lección
  const startConversation = async () => {
    conversationStarted.value = true
    isLoading.value = true
    try {
      const content = await callChat([
        {
          role: 'system',
          content: buildStartPrompt({
            ctx: grammarContext.value,
            characterName: character.value.name,
            emotions: EMOTIONS_PROMPT,
          }),
        },
      ])
      const parsed = parseAssistantMessage(content)
      messages.value = [{ role: 'assistant', content, ...parsed }]
      await speak(parsed.japanese, character.value.value, parsed.emotion)
    } catch (error) {
      console.error('Error al iniciar la conversación:', error)
      messages.value = [
        {
          role: 'assistant',
          content: 'こんにちは！会話を始めましょう。',
          japanese: 'こんにちは！会話を始めましょう。',
          translation: "Hi! Let's start a conversation.",
        },
      ]
    } finally {
      isLoading.value = false
    }
  }

  /** Empieza de cero (p. ej. al cambiar de lección): borra el chat y saluda de nuevo */
  const restartConversation = async () => {
    stopAllAudio()
    messages.value = []
    focus.value = null
    await startConversation()
  }

  /**
   * Enviar mensaje. Sin argumento usa el campo de texto; con `text` envía ese texto
   * (p. ej. la pregunta del botón "?" de un punto de gramática).
   */
  const sendMessage = async (text) => {
    const fromInput = typeof text !== 'string'
    const userMessage = (fromInput ? input.value : text).trim()
    if (!userMessage || isLoading.value) return
    if (fromInput) input.value = ''

    // Comandos (no van a la IA ni al historial, para no confundir la conversación)
    if (onCommand?.(userMessage)) return
    isLoading.value = true

    // Historial antes de añadir el mensaje del usuario
    const history = messages.value.map((msg) => ({ role: msg.role, content: msg.content }))
    messages.value.push({ role: 'user', content: userMessage, japanese: userMessage })
    const char = character.value
    try {
      const content = await callChat([
        {
          role: 'system',
          content: buildReplyPrompt({
            ctx: grammarContext.value,
            characterName: char.name,
            voiceStyles: char.styles.map((s) => s.name).join(','),
            emotions: EMOTIONS_PROMPT,
          }),
        },
        ...history,
        { role: 'user', content: userMessage },
      ])
      const parsed = parseAssistantMessage(content)
      const styleID = char.styles.find((s) => s.name === parsed.style)?.id || char.styles[0].id
      messages.value.push({ role: 'assistant', content, ...parsed, style: styleID.toString() })
      await speak(parsed.japanese, styleID.toString(), parsed.emotion)
    } catch (error) {
      console.error('Error:', error)
      messages.value.push({ ...ERROR_MESSAGE })
    } finally {
      isLoading.value = false
    }
  }

  /** Enfoca un punto de gramática (o lo quita si ya estaba enfocado) */
  const toggleFocus = (st, grammar) => {
    const same = focus.value?.st === st && focus.value?.grammar === grammar
    focus.value = same ? null : { st, grammar }
  }

  /** Pide al avatar que explique un punto de gramática con ejemplos simples */
  const explainGrammar = (grammar) => sendMessage(explainGrammarMessage(grammar))

  return {
    messages,
    input,
    lesson,
    lessonData,
    focus,
    isLoading,
    conversationStarted,
    character,
    isSpeaking,
    startConversation,
    restartConversation,
    sendMessage,
    toggleFocus,
    explainGrammar,
    stopAllAudio,
    speak,
  }
}
