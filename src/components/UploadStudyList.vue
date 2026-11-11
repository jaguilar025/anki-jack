<script setup>
// Contrato:
//  - emits: upload(categories) con el objeto { [nombre]: Word[] } ya validado y guardado
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Upload } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useCategoriesStore } from '@/stores/categories'

const emit = defineEmits(['upload'])

const categoriesStore = useCategoriesStore()
const isUploading = ref(false)

const handleUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = async (e) => {
    const target = e.target
    if (!target.files?.length) return

    const file = target.files[0]
    isUploading.value = true

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validar la estructura del JSON
      if (!data || typeof data !== 'object') {
        throw new Error('Formato de archivo inválido')
      }

      // Verificar que cada categoría tiene un array de palabras
      for (const category in data) {
        if (!Array.isArray(data[category])) {
          throw new Error(`La categoría "${category}" no contiene un array de palabras`)
        }

        // Verificar que cada palabra tiene la estructura correcta
        for (const word of data[category]) {
          if (!word.japanese_advance || !word.japanese_basic || (!word.spanish || !word.english)) {
            throw new Error(`Una palabra en la categoría "${category}" no tiene la estructura correcta`)
          }
        }
      }

      // Guardar las categorías personalizadas
      categoriesStore.saveCustomCategories(data)

      // Notificar al componente padre
      emit('upload', data)

      toast('Lista de estudio cargada', {
        description: `Se han cargado ${Object.keys(data).length} categorías con éxito`,
      })
    } catch (error) {
      console.error('Error al cargar el archivo:', error)
      toast.error('Error al cargar el archivo', {
        description: error instanceof Error ? error.message : 'Formato de archivo inválido',
      })
    } finally {
      isUploading.value = false
    }
  }

  input.click()
}
</script>

<template>
  <Button
    variant="outline"
    size="icon"
    :disabled="isUploading"
    title="Subir lista de estudio personalizada"
    @click="handleUpload"
  >
    <Upload :class="`h-[1.2rem] w-[1.2rem] ${isUploading ? 'animate-pulse' : ''}`" />
    <span class="sr-only">Subir lista de estudio</span>
  </Button>
</template>
