<script setup>
// Contrato: sin props ni emits. Borra los audios guardados en el navegador (src/lib/audioCache.js).
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { VolumeX } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { clearAudioCache, getAudioCacheStats } from '@/lib/audioCache'

const open = ref(false)
const stats = ref(null)
const isClearing = ref(false)

const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Al abrir el modal, muestra cuántos audios hay guardados
watch(open, async (isOpen) => {
  if (!isOpen) return
  stats.value = null
  stats.value = await getAudioCacheStats()
})

const handleClear = async () => {
  isClearing.value = true
  try {
    await clearAudioCache()
    toast.success('Audios eliminados', {
      description: 'Los audios se volverán a generar cuando los reproduzcas',
    })
    open.value = false
  } catch (error) {
    console.error('Error clearing audio cache:', error)
    toast.error('Error al eliminar los audios')
  } finally {
    isClearing.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline">
        <VolumeX class="h-[1.2rem] w-[1.2rem]" />
        <span class="hidden sm:inline">Borrar datos de audio</span>
        <span class="sr-only sm:hidden">Borrar datos de audio</span>
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>¿Borrar datos de audio?</DialogTitle>
        <DialogDescription>
          Se eliminarán todos los audios guardados en este navegador. No afecta a tu progreso ni a
          tus listas. Los audios se volverán a generar la próxima vez que los reproduzcas.
        </DialogDescription>
      </DialogHeader>
      <p class="text-sm text-muted-foreground">
        <template v-if="!stats">Calculando…</template>
        <template v-else-if="stats.count === 0">No hay audios guardados.</template>
        <template v-else>
          Audios guardados: <strong>{{ stats.count }}</strong> ({{ formatBytes(stats.bytes) }})
        </template>
      </p>
      <DialogFooter>
        <DialogClose as-child>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button
          variant="destructive"
          :disabled="isClearing || !stats || stats.count === 0"
          @click="handleClear"
        >
          {{ isClearing ? 'Borrando…' : 'Borrar audios' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
