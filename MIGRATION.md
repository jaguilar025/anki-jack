# Guía de migración anki-jack (Next/React/TS) → repite (Vue 3/JS)

Origen: `/home/jorge/Documents/WEB/anki-jack` (solo lectura, **no modificar**)
Destino: `/home/jorge/Documents/WEB/repite`

Si eres un agente: lee **solo** este archivo y los archivos de origen que te asignaron. No explores el resto del proyecto ni instales dependencias. Si te falta algo, déjalo como `// TODO(migración): ...` y menciónalo en tu respuesta.

## Reglas generales

- **JavaScript, no TypeScript.** Elimina los tipos. Si un tipo aporta información (forma de un objeto), conviértelo en un comentario JSDoc breve.
- **SFC con `<script setup>`** (sin `lang="ts"`), en el orden `<script setup>` → `<template>` → `<style>` (solo si hace falta; prioriza las clases de Tailwind).
- Props con `defineProps({ x: { type: String, required: true } })`. Eventos con `defineEmits([...])`.
- **Mantén el mismo aspecto y comportamiento.** Copia las clases de Tailwind tal cual (`className` → `class`). No rediseñes, no "mejores" ni añadas funcionalidades.
- Mantén los textos de la interfaz y los comentarios en español, como en el original.
- Fuente: Noto Serif + Noto Serif JP global (ya está configurada). Ignora `font-['Press_Start_2P']`, `Inter`, `Roboto` y `Noto Sans JP`: elimina esas clases.
- Componentes en `PascalCase.vue`. Composables `useXxx.js` en `src/composables/`.

## Equivalencias React → Vue

| React / Next | Vue |
|---|---|
| `useState(x)` | `ref(x)` (o `reactive` para objetos agrupados) |
| `useMemo(() => f, deps)` | `computed(() => f)` |
| `useEffect(fn, [])` | `onMounted(fn)` (+ `onUnmounted` para la limpieza) |
| `useEffect(fn, [a, b])` | `watch([a, b], fn)` (añade `{ immediate: true }` si también se ejecutaba al montar) |
| `useRef(null)` sobre un elemento DOM | `const el = useTemplateRef('el')` + `ref="el"` en el template |
| `useRef(valor)` mutable, no DOM | variable `let` normal, o `shallowRef` |
| `useCallback` | función normal |
| props callback `onX={fn}` | `emit('x', payload)` y en el padre `@x="fn"` |
| props `value` + `onChange` controlados | `v-model` / `defineModel()` |
| `{cond && <X/>}` / ternario | `v-if` / `v-else` |
| `.map(i => <X key=.../>)` | `v-for="i in items" :key="..."` |
| `children` | `<slot />` |
| `className={cn(...)}` | `:class="cn(...)"`, con `import { cn } from '@/lib/utils'` |
| `style={{ a: b }}` | `:style="{ a: b }"` |
| `onClick` / `onChange` / `onKeyDown` | `@click` / `@input` o `v-model` / `@keydown` |
| `"use client"` | eliminar |
| `next/link` `<Link href>` | `<RouterLink to>` |
| `next/image` `<Image>` | `<img>` |
| `useRouter()` de `next/navigation` | `useRouter()` de `vue-router`; `router.push(...)` igual |
| `useSearchParams().get('x')` | `useRoute().query.x` |
| `fetch('/api/...')` / `axios` | igual. Vite reenvía `/api` al backend Hono |

## Librerías

| React | Vue |
|---|---|
| `lucide-react`: `import { Sun } from "lucide-react"` | `import { Sun } from '@lucide/vue'` (mismos nombres) |
| `framer-motion`: `motion.div`, `AnimatePresence` | `motion-v`: `import { motion, AnimatePresence } from 'motion-v'` → `<motion.div :initial :animate :exit :transition>`. Si la animación es solo de entrada o salida simple, puedes usar `<Transition>` de Vue con clases de Tailwind |
| `next-themes` `useTheme()` | `import { useTheme } from '@/composables/useTheme'` → `{ isDark, toggleDark }` |
| `useToast()` / `toast({ title, description, variant })` | `import { toast } from 'vue-sonner'` → `toast.success(title, { description })`, `toast.error(...)` si `variant: "destructive"`, o `toast(title, { description })` |
| `@/components/ui/button` (shadcn React) | `import { Button } from '@/components/ui/button'` (shadcn-vue; las props `variant` y `size` son iguales) |
| `Select` de radix: `onValueChange` | `<Select v-model="x">` con `SelectTrigger`, `SelectValue`, `SelectContent` y `SelectItem` desde `@/components/ui/select` |
| `Switch` / `Checkbox`: `checked` + `onCheckedChange` | `v-model` (reka-ui usa `modelValue`) |
| `RadioGroup`: `value` + `onValueChange` | `<RadioGroup v-model="x">` |

Componentes shadcn-vue disponibles: button, card, checkbox, dialog, dropdown-menu, input, label, radio-group, select, separator, sheet, skeleton, sonner, switch, table, toggle, tooltip. **No añadas otros.**

## Estado y datos (ya creados, úsalos)

| Antes (Next) | Ahora (Vue) |
|---|---|
| `lib/storage.ts`: `getUserProgress`, `setUserProgress`, `updateUserProgress`, `clearUserProgress` | `useProgressStore()` en `@/stores/progress`: `progress` (ref), `setProgress(v)`, `updateProgress(cat, mode, pts)`, `clearProgress()` |
| `lib/data.ts`: `categories`, `getAllCategories`, `getCustomCategories`, `saveCustomCategories`, `clearCustomCategories` | `useCategoriesStore()` en `@/stores/categories`: `builtInCategories`, `customCategories`, `allCategories` (computed), `saveCustomCategories(v)`, `clearCustomCategories()`. Datos crudos en `@/data/categories` |
| `localStorage.getItem('voiceID')` y la búsqueda en `voices.json` | `useVoiceStore()` en `@/stores/voice`: `voiceID`, `character` (computed), `setVoice(id)`, `voices` |
| `@/lib/voices.json` | `@/data/voices.json` |
| `components/voicevox/config.ts` (`Characters`, `CharacterWords`) | `@/data/voicevox-characters` |
| `lib/kanji_n5.json` | `@/data/kanji_n5.json` (cliente) y `server/data/kanji_n5.json` (backend) |
| `hooks/use-mobile` | `useMediaQuery('(max-width: 767px)')` de `@vueuse/core` |

Con Pinia, para desestructurar refs de una store usa `storeToRefs(store)`.

## Backend (`server/`)

Hono sobre `@hono/node-server`, en el puerto `API_PORT` (8787 por defecto). Variables de entorno en `.env` (ver `.env.example`). En desarrollo, Vite reenvía `/api/*`. En producción (`npm start`) el mismo servidor sirve `dist/` y aplica un fallback a `index.html` para las rutas SPA.
SDK de IA: `ai@7` + `@ai-sdk/openai@4`. En v7, `maxTokens` se llama **`maxOutputTokens`**.
Debe mantener las mismas rutas, métodos, cuerpos y respuestas JSON que las rutas de `anki-jack/app/api/*` para que el frontend no cambie.

## Asignación de trabajo (origen → destino → modelo)

### Ya hecho (fases 1 y 2)
Router, `App.vue`, tema, `main.css` (colores neón, utilidades glow, typewriter, card-hover-effect, scrollbar-hide), `index.html`, `manifest.json`, `public/`, datos, stores, Vite con HTTPS (`npm run dev:https`) y proxy.

### Fase 3: backend (Sonnet)
| Origen | Destino |
|---|---|
| `app/api/{chat,process-kanji,tts,tts_version,audio,version}/route.*` | `server/index.js` + `server/routes/*.js` |

### Fase 4: componentes simples (Haiku)
| Origen | Destino |
|---|---|
| `components/mode-card.tsx` | `src/components/ModeCard.vue` |
| `components/score-display.tsx` | `src/components/ScoreDisplay.vue` |
| `components/progress-bar.tsx` | `src/components/ProgressBar.vue` |
| `components/message-bubble.tsx` | `src/components/MessageBubble.vue` |
| `components/theme-toggle.tsx` | `src/components/ThemeToggle.vue` |
| `components/kanji-info.tsx` | `src/components/KanjiInfo.vue` |
| `components/voicevox/{main,character-select,style-select}.tsx` | `src/components/voicevox/*.vue` |

### Fase 4b: componentes con lógica (Sonnet)
| Origen | Destino |
|---|---|
| `components/category-wheel.tsx` | `src/components/CategoryWheel.vue` |
| `components/upload-study-list.tsx` | `src/components/UploadStudyList.vue` |
| `components/data-management.tsx` | `src/components/DataManagement.vue` |
| `components/drawing-canvas.tsx` | `src/components/DrawingCanvas.vue` |
| `components/chat-interface.tsx` | `src/components/ChatInterface.vue` |

### Fase 5: composables (Sonnet)
| Origen | Destino |
|---|---|
| `hooks/use-audio.tsx` | `src/composables/useAudio.js` |
| `hooks/use-speech.tsx` | `src/composables/useSpeech.js` |
| `hooks/use-toast.tsx` | se elimina (`vue-sonner`) |

### Fase 6: compuestos y vistas (Sonnet; Opus solo si falla)
| Origen | Destino |
|---|---|
| `components/study-card.tsx` | `src/components/StudyCard.vue` |
| `components/dashboard.tsx` | `src/components/Dashboard.vue` |
| `app/main/page.tsx` | `src/views/MainView.vue` |
| `app/study/page.tsx` | `src/views/StudyView.vue` |
| `app/conversation/page.tsx` | `src/views/ConversationView.vue` |
| `app/dict-lens/page.tsx` | `src/views/DictLensView.vue` |
| `app/draw-kanji/page.tsx` | `src/views/DrawKanjiView.vue` |
| `app/table/page.tsx` | `src/views/TableView.vue` |

### Fase 7: landing / InfiniteMenu (Sonnet)
| Origen | Destino |
|---|---|
| `components/landingPage/InfiniteMenu.jsx` | Clases WebGL (JS puro) **copiadas sin cambios** a `src/components/landing/infinite-menu-gl.js`. Solo el componente React del final se reescribe como `src/components/landing/InfiniteMenu.vue`. `localStorage.setItem('voiceID')` → `useVoiceStore().setVoice()` |
| `components/landingPage/landing.tsx` + `app/page.tsx` | `src/components/landing/Landing.vue` + `src/views/LandingView.vue` |

### Fase 8: verificación (script + revisión Opus)
`npm run build`, `npm run lint`, `npx vitest run` y la revisión de la diferencia completa.

Archivos descartados (sin uso en Next): ver `docs/ARCHIVOS_DESCARTADOS.md`.

## Contratos de los componentes ya migrados (fases 3 a 5)

Úsalos tal cual. **No modifiques estos archivos.** Si un contrato no te sirve, déjalo anotado como TODO.

| Componente / composable | Contrato |
|---|---|
| `ModeCard.vue` | props `title`, `description`, `icon` (String), `isSelected`, `disabled` (Boolean). Emite `click` |
| `ScoreDisplay.vue` | props `score`, `lives` (Number) |
| `ProgressBar.vue` | prop `progress` (Number, 0 a 100) |
| `MessageBubble.vue` | props `message { role, content, translation?, japanese, style? }` y `character { value }`. Usa `useAudio` internamente |
| `ThemeToggle.vue` | sin props |
| `KanjiInfo.vue` | prop `kanjiResult` (Object). Emite `new-search` |
| `voicevox/VoicevoxMain.vue` | sin props. Emite `set-character({ name, value, word })` (antes `setCharacter`) |
| `voicevox/CharacterSelect.vue` | prop `playAudio` (Function). Emite `set-character` |
| `voicevox/StyleSelect.vue` | props `character`, `playAudio`. Emite `set-style` |
| `CategoryWheel.vue` | prop `options` (string[]). `v-model` con la opción seleccionada (antes `value` y `onChange`) |
| `UploadStudyList.vue` | sin props. Guarda en la store. Emite `upload(categories)` |
| `DataManagement.vue` | sin props ni emits (usa las stores) |
| `ChatInterface.vue` | props `messages`, `isLoading`, `character`. `v-model` con el texto del input (antes `input` y `setInput`). Emite `send` (antes `sendMessage`). **Ya no recibe `messagesEndRef`**: el padre usa `<ChatInterface ref="chat">` y llama a `chat.value.scrollToBottom()` |
| `DrawingCanvas.vue` | prop `disabled`. Emite `image-capture(dataUrl)` (antes `onImageCapture`) |
| `useAudio()` | `{ playAudio(text, speaker), stopAllAudio, voiceVoxStatus, elevanLabsStatus, isSpeaking, veryfyVoiceVoxStatus, veryfyElevenLabsStatus }` (los estados son refs) |
| `useSpeech()` | `{ speak, isLocalSpeaking, isSupported }` |
| Backend | `/api/{chat,process-kanji,tts,tts_version,audio,version}`, con las mismas peticiones y respuestas que en Next |
