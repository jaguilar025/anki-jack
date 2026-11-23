<script setup>
// Diálogo para borrar los audios guardados en el navegador (src/lib/audioCache.js).
//  - v-model:open: abrirlo desde fuera (p. ej. el menú principal)
//  - props: showTrigger → mostrar su propio botón (por defecto sí)
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
import { useI18n } from 'vue-i18n'
import { clearAudioCache, getAudioCacheStats } from '@/lib/audioCache'

const { t } = useI18n()
defineProps({ showTrigger: { type: Boolean, default: true } })
const open = defineModel('open', { type: Boolean, default: false })
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
    toast.success(t('dashboard.audioCache.cleared'), {
      description: t('dashboard.audioCache.clearedDesc'),
    })
    open.value = false
  } catch (error) {
    console.error('Error clearing audio cache:', error)
    toast.error(t('dashboard.audioCache.error'))
  } finally {
    isClearing.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger v-if="showTrigger" as-child>
      <Button variant="outline">
        <VolumeX class="h-[1.2rem] w-[1.2rem]" />
        <span class="hidden sm:inline">{{ t('dashboard.audioCache.button') }}</span>
        <span class="sr-only sm:hidden">{{ t('dashboard.audioCache.button') }}</span>
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('dashboard.audioCache.dialogTitle') }}</DialogTitle>
        <DialogDescription>
          {{ t('dashboard.audioCache.dialogDesc') }}
        </DialogDescription>
      </DialogHeader>
      <p class="text-sm text-muted-foreground">
        <template v-if="!stats">{{ t('dashboard.audioCache.calculating') }}</template>
        <template v-else-if="stats.count === 0">{{ t('dashboard.audioCache.empty') }}</template>
        <template v-else>
          {{ t('dashboard.audioCache.saved') }} <strong>{{ stats.count }}</strong> ({{ formatBytes(stats.bytes) }})
        </template>
      </p>
      <DialogFooter>
        <DialogClose as-child>
          <Button variant="outline">{{ t('common.cancel') }}</Button>
        </DialogClose>
        <Button
          variant="destructive"
          :disabled="isClearing || !stats || stats.count === 0"
          @click="handleClear"
        >
          {{ isClearing ? t('dashboard.audioCache.clearing') : t('dashboard.audioCache.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
