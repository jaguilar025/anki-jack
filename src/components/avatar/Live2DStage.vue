<script setup>
// Visor Live2D (Cubism 4) con la misma interfaz que AvatarStage (VRM):
//  - props: source (Blob del .zip del modelo), look (filtro de color del ambiente;
//           ver src/data/ambiences.js — Live2D es 2D y no tiene luces)
//  - emits: interact(zona) → nombre de la HitArea en minúsculas (p. ej. 'body'), con pausa por zona;
//           tap(zona) → en cada toque, sin pausa
//  - expose: attachAudio(audioElement), setEmotion(nombre, { resetAfter }), playGesture(nombre),
//            modelMotions (animaciones y expresiones que trae el modelo), playModelMotion(item)
// Usa pixi-live2d-display + Live2D Cubism Core (public/live2d/, licencia de Live2D Inc.:
// gratis para uso personal). Se carga solo al elegir un avatar Live2D.
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import * as PIXI from 'pixi.js'
import JSZip from 'jszip'
import { createLipSync } from './vrm/lipSync'
import { createProceduralMotion, EMOTION_GESTURE } from './motion/procedural'

const props = defineProps({
  source: { type: Blob, required: true },
  /** Si es false, solo se emite `interact` y la reacción la decide el padre */
  reactions: { type: Boolean, default: true },
  /** { brightness, saturation, tint, tintAmount } */
  look: { type: Object, default: null },
})
const emit = defineEmits(['interact', 'tap'])

const INTERACTION_COOLDOWN_MS = 450
// Palabras con las que se buscan expresiones del modelo para cada emoción
// (cada modelo nombra sus expresiones a su manera: "smile", "f01", "joy"…)
const EMOTION_KEYWORDS = {
  happy: ['happy', 'smile', 'joy', 'fun', 'egao'],
  sad: ['sad', 'sorrow', 'cry'],
  angry: ['angry', 'anger', 'mad'],
  surprised: ['surprise', 'shock'],
  relaxed: ['relax', 'calm'],
  think: ['think', 'trouble'],
}

const container = useTemplateRef('container')
/** [{ id, label, group, kind: 'motion' | 'expression', name, index }] del modelo cargado */
const modelMotions = ref([])
const procedural = createProceduralMotion()
let pointerInside = false
const status = ref('loading')
const errorMessage = ref('')

let app = null
let model = null
let Live2DModel = null
let audioContext = null
let lipSync = null
let resetTimer = null
let mouthParams = ['ParamMouthOpenY']
const lastInteractionAt = new Map()

// --- Carga del runtime ---

let corePromise = null
function loadCubismCore() {
  if (window.Live2DCubismCore) return Promise.resolve()
  corePromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/live2d/live2dcubismcore.min.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('No se pudo cargar Live2D Cubism Core'))
    document.head.appendChild(script)
  })
  return corePromise
}

async function loadRuntime() {
  if (Live2DModel) return
  await loadCubismCore()
  // pixi-live2d-display exige que el Core exista antes de importarse
  const lib = await import('pixi-live2d-display/cubism4')
  Live2DModel = lib.Live2DModel
  Live2DModel.registerTicker(PIXI.Ticker)
  // Lectura de modelos en .zip con JSZip
  const { ZipLoader } = lib
  ZipLoader.zipReader = (data) => JSZip.loadAsync(data)
  ZipLoader.readText = (zip, path) => zip.file(path).async('text')
  ZipLoader.getFilePaths = (zip) =>
    Object.keys(zip.files).filter((p) => !zip.files[p].dir && !p.startsWith('__MACOSX'))
  ZipLoader.getFiles = (zip, paths) =>
    Promise.all(
      paths.map(async (path) => {
        const blob = await zip.file(path).async('blob')
        return new File([blob], path.slice(path.lastIndexOf('/') + 1))
      }),
    )
}

// --- Escena ---

function fitModel() {
  if (!model || !app) return
  const { width, height } = app.screen
  model.scale.set(1)
  // Encuadre de medio cuerpo: el modelo 1.6 veces el alto de la pantalla (se ve de la
  // cabeza a la cintura). En pantallas verticales (celular) se limita por el ancho, pero con
  // margen para recortar los lados: si no, el modelo se encoge y se ve de cuerpo completo.
  const scale = Math.min((height * 1.6) / model.height, (width * 2.2) / model.width)
  model.scale.set(scale)
  model.x = width / 2
  model.y = height * 0.08
}

async function load(blob) {
  status.value = 'loading'
  unloadModel()
  try {
    await loadRuntime()
    const next = await Live2DModel.from([new File([blob], 'model.zip')], { autoInteract: false })
    if (blob !== props.source || !app) return next.destroy() // cambió mientras cargaba
    model = next
    model.anchor.set(0.5, 0)
    app.stage.addChild(model)
    updateFilters()
    fitModel()

    // Parámetros de boca que el propio modelo declara para lip-sync
    const lipGroup = model.internalModel.settings.groups?.find((g) => g.Name === 'LipSync')
    if (lipGroup?.Ids?.length) mouthParams = lipGroup.Ids

    model.internalModel.on('beforeModelUpdate', applyMouth)
    modelMotions.value = listModelMotions()
    status.value = 'ready'
  } catch (error) {
    console.error('[Live2DStage] Error al cargar el modelo:', error)
    errorMessage.value = 'avatar.stage.live2dError'
    status.value = 'error'
  }
}

function unloadModel() {
  clearTimeout(resetTimer)
  if (!model) return
  model.internalModel?.off('beforeModelUpdate', applyMouth)
  app?.stage.removeChild(model)
  model.destroy()
  model = null
  mouthParams = ['ParamMouthOpenY']
  modelMotions.value = []
}

// --- Ambiente: filtro de color ---

const adjustFilter = new PIXI.filters.ColorMatrixFilter()
const tintFilter = new PIXI.filters.ColorMatrixFilter()

/**
 * Los filtros dibujan el modelo en una textura intermedia; en pixi 6 su resolución es 1×
 * por defecto, lo que lo vuelve borroso en pantallas de alta densidad (celulares). Se usa
 * la del renderer, y si el ambiente no cambia el color se quitan (menos trabajo).
 */
function updateFilters() {
  if (!model || !app) return
  const look = props.look
  const neutral = !look || (look.brightness === 1 && look.saturation === 0 && look.tintAmount === 0)
  if (neutral) {
    model.filters = null
    return
  }
  adjustFilter.resolution = tintFilter.resolution = app.renderer.resolution
  model.filters = [adjustFilter, tintFilter]
}

function applyLook(look) {
  updateFilters()
  if (!look) return
  adjustFilter.brightness(look.brightness, false)
  adjustFilter.saturate(look.saturation, true)
  // Tinte: multiplica cada canal hacia el color elegido
  const c = PIXI.utils.hex2rgb(PIXI.utils.string2hex(look.tint))
  const k = look.tintAmount
  const [r, g, b] = c.map((v) => 1 - k + v * k)
  tintFilter.matrix = [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0]
}

watch(() => props.look, applyLook, { deep: true, immediate: true })

// --- Lip-sync ---

let lastFrame = performance.now()
function applyMouth() {
  const now = performance.now()
  const delta = Math.min((now - lastFrame) / 1000, 0.1)
  lastFrame = now
  if (!model) return
  applyPose(procedural.update(delta, { voice: lipSync?.level() ?? 0, active: pointerInside }))
  const v = lipSync?.vowels(delta)
  if (!v) return
  // Apertura según la vocal (la A abre más, la I menos); los pesos llegan hasta ~0.5
  const open = Math.min(1, (v.A * 1 + v.O * 0.85 + v.E * 0.7 + v.U * 0.6 + v.I * 0.5) * 2)
  const core = model.internalModel.coreModel
  for (const id of mouthParams) core.setParameterValueById(id, open)
  // Forma: E/I estiran (sonrisa), O/U redondean
  core.setParameterValueById('ParamMouthForm', Math.max(-1, Math.min(1, (v.E + v.I - v.O - v.U) * 2)))
}

// --- Movimiento procedural (encima de las animaciones del modelo) ---

const DEG = 180 / Math.PI
/** Suma la pose (radianes) a los parámetros estándar de ángulo de Live2D (grados, ±30) */
function applyPose(pose) {
  const core = model.internalModel.coreModel
  const add = (id, value) => value && core.addParameterValueById(id, value)
  add('ParamAngleX', -pose.headYaw * DEG * 1.3)
  add('ParamAngleY', -pose.headPitch * DEG * 1.3)
  add('ParamAngleZ', -pose.headRoll * DEG * 1.3)
  add('ParamBodyAngleX', -pose.spineYaw * DEG)
  add('ParamBodyAngleY', -pose.spinePitch * DEG)
  add('ParamBodyAngleZ', -pose.spineRoll * DEG)
}

function playGesture(name) {
  procedural.trigger(name)
}

// --- Animaciones y expresiones propias del modelo ---

function listModelMotions() {
  const settings = model.internalModel.settings
  const items = []
  for (const [group, defs] of Object.entries(settings.motions ?? {})) {
    defs.forEach((_, index) => {
      items.push({
        id: `motion:${group}:${index}`,
        label: defs.length > 1 ? `${group} ${index + 1}` : group,
        group: 'avatar.motions.modelMotions',
        kind: 'motion',
        name: group,
        index,
      })
    })
  }
  for (const e of settings.expressions ?? []) {
    items.push({ id: `expression:${e.Name}`, label: e.Name, group: 'avatar.motions.modelExpressions', kind: 'expression', name: e.Name })
  }
  return items
}

/** @param {{ kind: 'motion' | 'expression', name: string, index?: number }} item */
function playModelMotion(item) {
  if (!model) return
  if (item.kind === 'expression') return model.expression(item.name)
  // Prioridad FORCE (3): interrumpe la animación de reposo
  model.motion(item.name, item.index, 3)
}

async function attachAudio(audio) {
  try {
    if (!audioContext) audioContext = new AudioContext()
    if (audioContext.state === 'suspended') await audioContext.resume()
    if (!lipSync) lipSync = await createLipSync(audioContext)
    lipSync.connect(audio)
  } catch (error) {
    console.error('[Live2DStage] No se pudo conectar el lip-sync:', error)
  }
}

// --- Emociones ---

function findExpression(emotion) {
  const defs = model?.internalModel.settings.expressions ?? []
  const keywords = EMOTION_KEYWORDS[emotion] ?? []
  return defs.find((e) => keywords.some((k) => e.Name?.toLowerCase().includes(k)))?.Name
}

/**
 * Usa una expresión del modelo cuyo nombre coincida con la emoción.
 * Muchos modelos (p. ej. Hiyori) no traen expresiones: entonces la emoción se ignora.
 */
function setEmotion(emotion, { resetAfter = 3000 } = {}) {
  if (!model) return
  if (EMOTION_GESTURE[emotion]) procedural.trigger(EMOTION_GESTURE[emotion])
  const manager = model.internalModel.motionManager.expressionManager
  clearTimeout(resetTimer)
  if (emotion === 'neutral') return manager?.resetExpression()
  const name = findExpression(emotion)
  if (!name) return
  model.expression(name)
  if (resetAfter > 0) resetTimer = setTimeout(() => manager?.resetExpression(), resetAfter)
}

defineExpose({ attachAudio, setEmotion, playGesture, modelMotions, playModelMotion })

// --- Puntero: mirada y clic ---

function toStage(event) {
  const rect = app.view.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function onPointerMove(event) {
  pointerInside = true
  if (!model) return
  const { x, y } = toStage(event)
  model.focus(x, y)
}

function onPointerLeave() {
  pointerInside = false
  if (!model || !app) return
  // Vuelve a mirar al frente (a la altura de la cara)
  model.focus(app.screen.width / 2, app.screen.height * 0.25)
}

function onClick(event) {
  if (!model) return
  const { x, y } = toStage(event)
  const area = model.hitTest(x, y)[0]
  if (!area) return
  const target = area.toLowerCase()
  // Cada toque se avisa (p. ej. para contar toques rápidos); la reacción tiene una pausa por zona
  emit('tap', target)
  const now = Date.now()
  if (now - (lastInteractionAt.get(target) ?? 0) < INTERACTION_COOLDOWN_MS) return
  lastInteractionAt.set(target, now)

  if (props.reactions) {
    // Motion de toque del modelo: "Tap@Body" para la zona, o "Tap" genérico
    const groups = Object.keys(model.internalModel.settings.motions ?? {})
    const group = groups.find((g) => g.toLowerCase() === `tap@${target}`) ?? groups.find((g) => g.toLowerCase() === 'tap')
    if (group) model.motion(group)
  }
  emit('interact', target)
}

// --- Ciclo de vida ---

let resizeObserver = null

onMounted(() => {
  app = new PIXI.Application({
    resizeTo: container.value,
    backgroundAlpha: 0, // fondo transparente: lo pinta el CSS
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio, 2),
  })
  container.value.appendChild(app.view)
  app.view.addEventListener('pointermove', onPointerMove)
  app.view.addEventListener('pointerleave', onPointerLeave)
  app.view.addEventListener('click', onClick)
  resizeObserver = new ResizeObserver(() => {
    app?.resize()
    fitModel()
  })
  resizeObserver.observe(container.value)
  load(props.source)
})

watch(() => props.source, (blob) => load(blob))

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  unloadModel()
  lipSync?.dispose()
  audioContext?.close()
  app?.destroy(true)
  app = null
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="container" class="absolute inset-0" />
    <div
      v-if="status !== 'ready'"
      class="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <p v-if="status === 'loading'" class="text-sm text-muted-foreground">{{ $t('avatar.stage.loading') }}</p>
      <p v-else class="px-6 text-center text-sm text-muted-foreground">{{ $t(errorMessage) }}</p>
    </div>
  </div>
</template>
