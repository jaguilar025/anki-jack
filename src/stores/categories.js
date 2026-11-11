import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { categories as builtInCategories } from '@/data/categories'

/**
 * Categorías de vocabulario: predefinidas + personalizadas (subidas por el usuario).
 * Reemplaza las funciones de localStorage de anki-jack/lib/data.ts.
 * Forma de una categoría: { [nombre]: Word[] }, Word = { japanese_advance, japanese_basic, spanish?, english? }
 */
export const useCategoriesStore = defineStore('categories', () => {
  const customCategories = useLocalStorage('nihongo-study-custom-categories', null, {
    serializer: {
      read: (v) => {
        try {
          return v ? JSON.parse(v) : null
        } catch {
          return null
        }
      },
      write: (v) => JSON.stringify(v),
    },
  })

  const allCategories = computed(() =>
    customCategories.value ? { ...builtInCategories, ...customCategories.value } : builtInCategories,
  )

  function saveCustomCategories(value) {
    customCategories.value = value
  }

  function clearCustomCategories() {
    customCategories.value = null
  }

  return { builtInCategories, customCategories, allCategories, saveCustomCategories, clearCustomCategories }
})
