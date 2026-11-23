// Acciones sobre los datos del usuario (progreso y listas de estudio), usadas por el menú principal.
// Antes vivían en DataManagement.vue y UploadStudyList.vue.
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import { useProgressStore } from '@/stores/progress'
import { useCategoriesStore } from '@/stores/categories'

/** Abre el selector de archivos y devuelve el elegido (o null) */
function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

export function useDataActions() {
  const { t } = useI18n()
  const progressStore = useProgressStore()
  const categoriesStore = useCategoriesStore()
  const isUploading = ref(false)

  function exportProgress() {
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(progressStore.progress))
    const link = document.createElement('a')
    link.setAttribute('href', dataUri)
    link.setAttribute('download', 'nihongo-study-progress.json')
    link.click()
    toast.success(t('dashboard.data.exported'), { description: t('dashboard.data.exportedDesc') })
  }

  async function importProgress() {
    const file = await pickFile('.json')
    if (!file) return
    try {
      progressStore.setProgress(JSON.parse(await file.text()))
      toast.success(t('dashboard.data.imported'), { description: t('dashboard.data.importedDesc') })
      window.location.reload()
    } catch (error) {
      console.error('Error importing data:', error)
      toast.error(t('dashboard.data.importError'), { description: t('dashboard.data.importErrorDesc') })
    }
  }

  function clearAllData() {
    if (!confirm(t('dashboard.data.confirmClear'))) return
    progressStore.clearProgress()
    categoriesStore.clearCustomCategories()
    toast.success(t('dashboard.data.cleared'), { description: t('dashboard.data.clearedDesc') })
    window.location.reload()
  }

  /**
   * Sube una lista de estudio personalizada: { [categoría]: Word[] }.
   * Cada palabra necesita japanese_advance, japanese_basic y una traducción (spanish o english).
   * @returns {Promise<object | null>} las categorías cargadas, o null si se canceló o falló
   */
  async function uploadStudyList() {
    const file = await pickFile('.json')
    if (!file) return null
    isUploading.value = true
    try {
      const data = JSON.parse(await file.text())
      if (!data || typeof data !== 'object') throw new Error(t('dashboard.upload.invalidFormat'))
      for (const category in data) {
        if (!Array.isArray(data[category])) throw new Error(t('dashboard.upload.notArray', { category }))
        for (const word of data[category]) {
          if (!word.japanese_advance || !word.japanese_basic || (!word.spanish && !word.english)) {
            throw new Error(t('dashboard.upload.badWord', { category }))
          }
        }
      }
      categoriesStore.saveCustomCategories(data)
      toast(t('dashboard.upload.success'), {
        description: t('dashboard.upload.successDesc', { count: Object.keys(data).length }),
      })
      return data
    } catch (error) {
      console.error('Error al cargar el archivo:', error)
      toast.error(t('dashboard.upload.error'), {
        description: error instanceof Error ? error.message : t('dashboard.upload.invalidFormat'),
      })
      return null
    } finally {
      isUploading.value = false
    }
  }

  return { exportProgress, importProgress, clearAllData, uploadStudyList, isUploading }
}
