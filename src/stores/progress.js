import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

/**
 * Progreso del usuario por categoría y modo.
 * Reemplaza anki-jack/lib/storage.ts. Misma clave de localStorage para mantener compatibilidad.
 * Forma: { [category]: { [mode]: { score: number, completedWords?: string[] } } }
 */
export const useProgressStore = defineStore('progress', () => {
  const progress = useLocalStorage('nihongo-study-progress', {})

  function setProgress(value) {
    progress.value = value ?? {}
  }

  function updateProgress(category, mode, points) {
    const next = { ...progress.value }
    next[category] = { ...(next[category] ?? {}) }
    next[category][mode] = { score: 0, ...(next[category][mode] ?? {}) }
    next[category][mode].score += points
    progress.value = next
  }

  function clearProgress() {
    progress.value = {}
  }

  return { progress, setProgress, updateProgress, clearProgress }
})
