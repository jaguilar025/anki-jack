<script setup>
// Video local (archivo en public/) como fondo, cubriendo todo (object-fit: cover) sin importar si
// es horizontal o vertical. A diferencia de YouTube, se puede precargar y leer su tiempo exacto,
// lo que permite sincronizar animaciones con él.
//  - props: src, volume (0-100), muted
//  - expose: el elemento <video> (videoEl) para controlarlo desde fuera
import { useTemplateRef, watchEffect } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  volume: { type: Number, default: 100 },
  muted: { type: Boolean, default: false },
})

const videoEl = useTemplateRef('videoEl')

watchEffect(() => {
  if (!videoEl.value) return
  videoEl.value.volume = Math.min(1, Math.max(0, props.volume / 100))
  videoEl.value.muted = props.muted
})

defineExpose({ videoEl })
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
    <video ref="videoEl" :src="src" preload="auto" playsinline class="size-full object-cover" />
  </div>
</template>
