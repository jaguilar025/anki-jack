<script setup>
// Video de YouTube como fondo con la IFrame Player API (para controlar sonido y volumen).
// Arranca silenciado (el navegador solo permite autoplay así); si el usuario lo quiere con
// sonido, se activa en su primer clic/tecla en la página. En bucle, sin controles, sin recibir
// clics y escalado para cubrir todo (como object-fit: cover).
//  - props: videoId, muted, volume (0-100)
//  - emits: quality(texto) → calidad que YouTube eligió (no se puede forzar desde la API)
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = defineProps({
  videoId: { type: String, required: true },
  muted: { type: Boolean, default: true },
  volume: { type: Number, default: 50 },
})
const emit = defineEmits(['quality'])

const QUALITY_LABELS = {
  tiny: '144p',
  small: '240p',
  medium: '360p',
  large: '480p',
  hd720: '720p',
  hd1080: '1080p',
  hd1440: '1440p',
  hd2160: '4K',
  highres: '4K+',
}

const target = useTemplateRef('target')
let player = null
let ready = false
let waitingGesture = false

// La API se carga una sola vez para toda la app
let apiPromise = null
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}

function reportQuality() {
  const q = player?.getPlaybackQuality?.()
  if (q && q !== 'unknown') emit('quality', QUALITY_LABELS[q] ?? q)
}

function applySound() {
  if (!ready) return
  player.setVolume(props.volume)
  if (props.muted) {
    player.mute()
  } else if (navigator.userActivation?.hasBeenActive ?? true) {
    player.unMute()
  } else if (!waitingGesture) {
    // Aún no hay interacción en la página: el navegador pausaría el video al quitar el silencio
    waitingGesture = true
    const onGesture = () => {
      waitingGesture = false
      applySound()
    }
    window.addEventListener('pointerdown', onGesture, { once: true, capture: true })
    window.addEventListener('keydown', onGesture, { once: true, capture: true })
  }
}

onMounted(async () => {
  const YT = await loadYoutubeApi()
  if (!target.value) return // se desmontó mientras cargaba
  player = new YT.Player(target.value, {
    host: 'https://www.youtube-nocookie.com',
    videoId: props.videoId,
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      mute: 1,
      loop: 1,
      playlist: props.videoId, // necesario para que `loop` funcione con un solo video
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3, // sin anotaciones
      playsinline: 1,
      rel: 0,
    },
    events: {
      onReady: () => {
        ready = true
        player.playVideo()
        applySound()
      },
      onPlaybackQualityChange: reportQuality,
      onStateChange: reportQuality,
    },
  })
})

watch(() => [props.muted, props.volume], applySound)

onBeforeUnmount(() => {
  player?.destroy?.()
  player = null
})
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <!-- 16:9 que siempre cubre el contenedor; lo que sobra se recorta -->
    <div class="absolute left-1/2 top-1/2 h-[max(100%,56.25vw)] w-[max(100%,177.78vh)] -translate-x-1/2 -translate-y-1/2">
      <div ref="target" />
    </div>
  </div>
</template>
