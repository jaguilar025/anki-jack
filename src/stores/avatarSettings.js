import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import * as library from '@/lib/avatarLibrary'
import { AMBIENCES, DEFAULT_AMBIENCE } from '@/data/ambiences'
import { i18n } from '@/i18n'

/**
 * Avatares incluidos. `url`: archivo local (sin descarga). `remoteUrl`: se descarga al elegirlo
 * (vía /api/avatar-download; agrega el host a su lista si añades otro) y queda guardado.
 * Live2D siempre es un .zip con el .model3.json, texturas, etc.
 */
export const AVATAR_PRESETS = [
  {
    id: 'vrm-sample-a',
    name: 'AvatarSample A',
    format: 'vrm',
    url: '/avatars/avatar.vrm',
    preview: '/avatars/previews/vrm-sample-a.png',
  },
  {
    id: 'vrm-sample-b',
    name: 'AvatarSample B',
    format: 'vrm',
    remoteUrl: 'https://dist.ayaka.moe/vrm-models/VRoid-Hub/AvatarSample-B/AvatarSample_B.vrm',
    size: 28_333_772,
    preview: '/avatars/previews/vrm-sample-b.png',
  },
  {
    // Modelo de あかりみち@Akarimichi: uso personal; prohibido redistribuirlo o comercializarlo.
    // Por eso el .vrm y su vista previa están en .gitignore (solo existen en tu equipo).
    id: 'vrm-hatsune-miku',
    name: '初音ミク',
    format: 'vrm',
    url: '/avatars/hatsune-miku.vrm',
    preview: '/avatars/previews/vrm-hatsune-miku.png',
  },
  {
    // 止丸式初音ミク (止丸): uso no comercial. Su readme permite redistribuir con créditos, pero los
    // metadatos del VRM lo prohíben: por precaución el .vrm y su vista previa están en .gitignore.
    id: 'vrm-miku-2',
    name: '初音ミク 2',
    format: 'vrm',
    url: '/avatars/miku-2.vrm',
    preview: '/avatars/previews/vrm-miku-2.png',
  },
  {
    id: 'live2d-hiyori',
    name: 'Hiyori',
    format: 'live2d',
    remoteUrl: 'https://dist.ayaka.moe/live2d-models/hiyori_free_zh.zip',
    size: 2_942_769,
    preview: '/avatars/previews/live2d-hiyori.png',
  },
  {
    id: 'live2d-hiyori-pro',
    name: 'Hiyori Pro',
    format: 'live2d',
    remoteUrl: 'https://dist.ayaka.moe/live2d-models/hiyori_pro_zh.zip',
    size: 4_482_221,
    preview: '/avatars/previews/live2d-hiyori.png',
  },
]

/** Fondos predefinidos de la escena del avatar (valor CSS de `background`). */
export const BACKGROUND_PRESETS = [
  { id: 'aurora', labelKey: 'avatar.background.aurora', css: 'linear-gradient(160deg, #fbd3e9 0%, #d9d7f7 45%, #bde3f7 100%)' },
  { id: 'sakura', labelKey: 'avatar.background.sakura', css: 'linear-gradient(180deg, #fff1f5 0%, #ffd6e5 60%, #f7b8cf 100%)' },
  { id: 'sunset', labelKey: 'avatar.background.sunset', css: 'linear-gradient(180deg, #ffcf9f 0%, #ff9a9e 55%, #a18cd1 100%)' },
  { id: 'mint', labelKey: 'avatar.background.mint', css: 'linear-gradient(160deg, #e0fff4 0%, #b8f0dc 50%, #9ad8e6 100%)' },
  { id: 'night', labelKey: 'avatar.background.night', css: 'radial-gradient(ellipse at top, #2b2f4a 0%, #14162a 60%, #0b0c16 100%)' },
  { id: 'studio', labelKey: 'avatar.background.studio', css: 'radial-gradient(ellipse at center, #3a3a3f 0%, #1b1b1f 75%)' },
  // Ilustraciones (public/backgrounds/)
  { id: 'bridge', labelKey: 'avatar.background.bridge', css: "url('/backgrounds/bridge.webp') center / cover no-repeat" },
  { id: 'room', labelKey: 'avatar.background.room', css: "url('/backgrounds/room.webp') center / cover no-repeat" },
  { id: 'sakuraPark', labelKey: 'avatar.background.sakuraPark', css: "url('/backgrounds/sakura-park.webp') center / cover no-repeat" },
  // Para recortar el avatar en OBS u otros programas (chroma key)
  { id: 'green', labelKey: 'avatar.background.green', css: '#00ff00' },
]

/**
 * Id del video a partir de un link de YouTube (watch, youtu.be, shorts, live, embed) o null.
 * @param {string} url
 */
export function parseYoutubeId(url) {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '')
    let id = null
    if (host === 'youtu.be') id = u.pathname.slice(1)
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|live|embed)\/([^/?]+)/)?.[1]
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

/**
 * Preferencias de la vista del avatar, guardadas en localStorage.
 * background: id de un preset, 'color' (usa `color`), 'image' (usa `image`, data URL)
 * o 'youtube' (usa `youtubeId`: el video se reproduce silenciado y en bucle detrás del avatar).
 */
export const useAvatarSettingsStore = defineStore('avatarSettings', () => {
  const background = useLocalStorage('avatar-background', 'aurora')
  const color = useLocalStorage('avatar-background-color', '#c7d2fe')
  const image = useLocalStorage('avatar-background-image', '')
  const youtubeId = useLocalStorage('avatar-background-youtube', '')

  // Sonido del video de fondo
  const videoMuted = useLocalStorage('avatar-video-muted', true)
  const videoVolume = useLocalStorage('avatar-video-volume', 50)
  /** Bajar el video mientras habla el avatar */
  const videoDuck = useLocalStorage('avatar-video-duck', true)

  /** Video de fondo activo (o null) */
  const backgroundVideoId = computed(() =>
    background.value === 'youtube' && youtubeId.value ? youtubeId.value : null,
  )

  const backgroundStyle = computed(() => {
    if (background.value === 'color') return { background: color.value }
    // Mientras carga el video
    if (backgroundVideoId.value) return { background: '#000' }
    if (background.value === 'image' && image.value) {
      return {
        backgroundImage: `url(${image.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    const preset = BACKGROUND_PRESETS.find((p) => p.id === background.value) ?? BACKGROUND_PRESETS[0]
    return { background: preset.css }
  })

  /**
   * Guarda una imagen propia como fondo. Se reduce a 1920 px y JPEG para que quepa
   * en localStorage (~5 MB por sitio).
   * @param {File} file
   */
  async function setImage(file) {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    image.value = canvas.toDataURL('image/jpeg', 0.85)
    background.value = 'image'
  }

  /** Usa un video de YouTube como fondo. Devuelve false si el link no es válido. */
  function setYoutube(url) {
    const id = parseYoutubeId(url)
    if (!id) return false
    youtubeId.value = id
    background.value = 'youtube'
    return true
  }

  function removeYoutube() {
    youtubeId.value = ''
    if (background.value === 'youtube') background.value = 'aurora'
  }

  function removeImage() {
    image.value = ''
    if (background.value === 'image') background.value = 'aurora'
  }

  // --- Ambiente (iluminación VRM / filtro de color Live2D) ---

  /** Id del ambiente elegido, o 'custom' si se movió algún ajuste fino */
  const ambienceId = useLocalStorage('avatar-ambience', DEFAULT_AMBIENCE.id)
  const vrmLighting = useLocalStorage('avatar-vrm-lighting', structuredClone(DEFAULT_AMBIENCE.vrm), {
    mergeDefaults: true,
  })
  const live2dLook = useLocalStorage('avatar-live2d-look', structuredClone(DEFAULT_AMBIENCE.live2d), {
    mergeDefaults: true,
  })

  /** Aplica un ambiente a ambos tipos de avatar */
  function applyAmbience(id) {
    const ambience = AMBIENCES.find((a) => a.id === id) ?? DEFAULT_AMBIENCE
    ambienceId.value = ambience.id
    vrmLighting.value = structuredClone(ambience.vrm)
    live2dLook.value = structuredClone(ambience.live2d)
  }

  /** Vuelve a los valores del ambiente elegido (o al de Día si era personalizado) */
  function resetAmbience() {
    applyAmbience(ambienceId.value)
  }

  // --- Avatares ---

  /** Formato del avatar que se está mostrando ahora ('vrm' | 'live2d'); lo fija la vista */
  const loadedFormat = ref(null)

  /** Subidos por el usuario: { id, name, format, size } (el archivo va en avatarLibrary) */
  const customAvatars = useLocalStorage('avatar-custom', [])
  const selectedAvatarId = useLocalStorage('avatar-selected', AVATAR_PRESETS[0].id)
  /** Ids ya guardados localmente (descargados o subidos) */
  const stored = ref(new Set())
  /** Descargas en curso: id → progreso 0..1 (-1 = tamaño desconocido) */
  const downloads = reactive({})

  const avatars = computed(() => [
    ...AVATAR_PRESETS,
    ...customAvatars.value.map((a) => ({ ...a, custom: true })),
  ])
  const selectedAvatar = computed(
    () => avatars.value.find((a) => a.id === selectedAvatarId.value) ?? AVATAR_PRESETS[0],
  )

  library.listIds().then((ids) => (stored.value = new Set(ids)))

  const isAvailable = (avatar) => Boolean(avatar.url) || stored.value.has(avatar.id)

  /**
   * Datos del modelo para el visor: { format, url } (VRM local) o { format, blob }.
   * Si es remoto y no está guardado, lo descarga (con progreso en `downloads`).
   */
  async function loadAvatar(avatar) {
    if (avatar.url) return { format: avatar.format, url: avatar.url }
    let blob = await library.getBlob(avatar.id)
    if (!blob) {
      if (!avatar.remoteUrl) throw new Error(i18n.global.t('avatar.errors.avatarMissing'))
      if (avatar.id in downloads) throw new Error(i18n.global.t('avatar.errors.alreadyDownloading'))
      downloads[avatar.id] = 0
      try {
        blob = await library.download(avatar.id, avatar.remoteUrl, (p) => (downloads[avatar.id] = p))
        stored.value = new Set([...stored.value, avatar.id])
      } finally {
        delete downloads[avatar.id]
      }
    }
    return { format: avatar.format, blob }
  }

  /** Agrega un avatar propio (.vrm o .zip de Live2D) y lo selecciona. */
  async function addCustomAvatar(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const format = ext === 'vrm' ? 'vrm' : ext === 'zip' ? 'live2d' : null
    if (!format) throw new Error(i18n.global.t('avatar.errors.badAvatarFile'))
    const id = `custom-${crypto.randomUUID()}`
    await library.putBlob(id, file)
    stored.value = new Set([...stored.value, id])
    customAvatars.value = [
      ...customAvatars.value,
      { id, name: file.name.replace(/\.(vrm|zip)$/i, ''), format, size: file.size },
    ]
    selectedAvatarId.value = id
  }

  async function removeCustomAvatar(id) {
    await library.deleteBlob(id)
    customAvatars.value = customAvatars.value.filter((a) => a.id !== id)
    const next = new Set(stored.value)
    next.delete(id)
    stored.value = next
    if (selectedAvatarId.value === id) selectedAvatarId.value = AVATAR_PRESETS[0].id
  }

  // --- Animaciones .vrma (VRM) subidas por el usuario ---

  /** [{ id, name, size }] (el archivo va en avatarLibrary) */
  const customAnimations = useLocalStorage('avatar-animations', [])
  const animationUrls = new Map() // id → object URL

  /**
   * Agrega animaciones: un .vrma o un .zip con varios (p. ej. el pack oficial de VRoid).
   * @returns {Promise<number>} cuántas se agregaron
   */
  async function addAnimations(file) {
    const entries = [] // [{ name, blob }]
    if (/\.vrma$/i.test(file.name)) {
      entries.push({ name: file.name, blob: file })
    } else if (/\.zip$/i.test(file.name)) {
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(file)
      for (const path of Object.keys(zip.files)) {
        if (zip.files[path].dir || !/\.vrma$/i.test(path) || path.includes('__MACOSX')) continue
        entries.push({ name: path.split('/').pop(), blob: await zip.file(path).async('blob') })
      }
    }
    if (!entries.length) throw new Error(i18n.global.t('avatar.errors.noVrma'))

    const added = []
    for (const { name, blob } of entries) {
      const id = `anim-${crypto.randomUUID()}`
      await library.putBlob(id, blob)
      added.push({ id, name: name.replace(/\.vrma$/i, ''), size: blob.size })
    }
    customAnimations.value = [...customAnimations.value, ...added]
    return added.length
  }

  async function removeAnimation(id) {
    await library.deleteBlob(id)
    customAnimations.value = customAnimations.value.filter((a) => a.id !== id)
    if (animationUrls.has(id)) URL.revokeObjectURL(animationUrls.get(id))
    animationUrls.delete(id)
  }

  /** URL local para cargar la animación en el visor (o null si ya no está guardada) */
  async function getAnimationUrl(id) {
    if (animationUrls.has(id)) return animationUrls.get(id)
    const blob = await library.getBlob(id)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    animationUrls.set(id, url)
    return url
  }

  return {
    customAnimations,
    addAnimations,
    removeAnimation,
    getAnimationUrl,
    background,
    color,
    image,
    backgroundStyle,
    setImage,
    removeImage,
    youtubeId,
    backgroundVideoId,
    videoMuted,
    videoVolume,
    videoDuck,
    setYoutube,
    removeYoutube,
    ambienceId,
    vrmLighting,
    live2dLook,
    applyAmbience,
    resetAmbience,
    loadedFormat,
    avatars,
    selectedAvatarId,
    selectedAvatar,
    downloads,
    isAvailable,
    loadAvatar,
    addCustomAvatar,
    removeCustomAvatar,
  }
})
