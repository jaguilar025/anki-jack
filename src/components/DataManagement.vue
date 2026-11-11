<script setup>
// Contrato: sin props ni emits. Lee/escribe en las stores progress y categories.
import { toast } from 'vue-sonner'
import { Download, Upload, Trash } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProgressStore } from '@/stores/progress'
import { useCategoriesStore } from '@/stores/categories'

const progressStore = useProgressStore()
const categoriesStore = useCategoriesStore()

const handleExport = () => {
  const dataStr = JSON.stringify(progressStore.progress)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

  const exportFileDefaultName = 'nihongo-study-progress.json'

  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()

  toast.success('Progreso exportado', {
    description: 'Se ha descargado el archivo con tu progreso',
  })
}

const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = (e) => {
    const target = e.target
    if (!target.files?.length) return

    const file = target.files[0]
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const progress = JSON.parse(event.target?.result)
        progressStore.setProgress(progress)

        toast.success('Progreso importado', {
          description: 'Se ha cargado tu progreso correctamente',
        })

        window.location.reload()
      } catch (error) {
        console.error('Error importing data:', error)

        toast.error('Error al importar datos', {
          description: 'Formato incorrecto o archivo dañado',
        })
      }
    }

    reader.readAsText(file)
  }

  input.click()
}

const handleClearData = () => {
  if (
    confirm(
      '¿Estás seguro de que quieres eliminar todo tu progreso y listas personalizadas? Esta acción no se puede deshacer.',
    )
  ) {
    progressStore.clearProgress()
    categoriesStore.clearCustomCategories()

    toast.success('Datos eliminados', {
      description: 'Se ha eliminado todo tu progreso y listas personalizadas',
    })

    window.location.reload()
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="icon">
        <Download class="h-[1.2rem] w-[1.2rem]" />
        <span class="sr-only">Gestionar datos</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem @click="handleExport">
        <Download class="mr-2 h-4 w-4" />
        <span>Exportar progreso</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="handleImport">
        <Upload class="mr-2 h-4 w-4" />
        <span>Importar progreso</span>
      </DropdownMenuItem>
      <DropdownMenuItem class="text-destructive" @click="handleClearData">
        <Trash class="mr-2 h-4 w-4" />
        <span>Eliminar datos</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
