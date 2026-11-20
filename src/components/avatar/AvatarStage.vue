<script setup>
// Escena 3D con un avatar VRM: animación idle, parpadeo, lip-sync, mirada que sigue al cursor
// y reacciones al hacer clic en zonas del cuerpo.
//  - props: modelUrl (.vrm), idleAnimationUrl (.vrma), reactions (reacción por defecto al clic),
//           lighting (luces del ambiente; ver src/data/ambiences.js)
//  - emits: interact(zona) → 'head' | 'leftHand' | 'rightUpperArm' | …
//  - expose: attachAudio(audioElement) → conecta el audio que va a sonar para mover la boca.
//            Llamarlo ANTES de audio.play().
//            setEmotion(nombre, { intensity, resetAfter }) → happy, sad, angry, surprised, relaxed, think, neutral
//            (además hace el gesto de esa emoción: asentir, ladear la cabeza…)
//            playGesture(nombre) → gestos procedurales (ver motion/procedural.js)
//            playAnimation(url) → reproduce una vez un .vrma y vuelve a la animación en reposo
import { onMounted, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import {
  AnimationMixer,
  DirectionalLight,
  Euler,
  HemisphereLight,
  LoopOnce,
  MathUtils,
  LoopRepeat,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadVrm, loadAnimationClip, disposeVrm } from './vrm/loader'
import { createLipSync } from './vrm/lipSync'
import { createBlink } from './vrm/blink'
import { createEmote } from './vrm/expression'
import { createProceduralMotion, EMOTION_GESTURE } from './motion/procedural'
import {
  createInteractionColliders,
  defaultReaction,
  getTargetFromObjectName,
  isClickLike,
} from './vrm/interaction'

const props = defineProps({
  modelUrl: { type: String, required: true },
  idleAnimationUrl: { type: String, default: '/avatars/animations/idle_loop.vrma' },
  /** Si es false, solo se emite `interact` y la reacción la decide el padre */
  reactions: { type: Boolean, default: true },
  /** { key: { color, intensity, azimuth, elevation }, sky, ground, hemi, rim: { color, intensity } } */
  lighting: { type: Object, default: null },
})
const emit = defineEmits(['interact'])

const INTERACTION_COOLDOWN_MS = 450
// Distancia (desde la cámara) del punto al que mira el avatar: cerca de la cámara,
// así parece que mira al cursor del usuario y no a un punto detrás de él (igual que AIRI).
const GAZE_DISTANCE = 0.8

const container = useTemplateRef('container')
/** @type {import('vue').Ref<'loading'|'ready'|'error'>} */
const status = ref('loading')
const progress = ref(0)
const errorMessage = ref('')
const hovering = ref(false)

let renderer, scene, camera, controls, timer, resizeObserver, frameId
let keyLight, hemiLight, rimLight
let vrm = null
let mixer = null
let idleAction = null
let oneShot = null // animación .vrma en curso
const clipCache = new Map() // url → AnimationClip (son del modelo actual)
const procedural = createProceduralMotion()
let restPose = new Map() // hueso → rotación de reposo
let emote = null
let interaction = null
let audioContext = null
let lipSync = null
const blink = createBlink()

const raycaster = new Raycaster()
const pointerNdc = new Vector2()
let pointerInside = false
let pointerDown = null
const lastInteractionAt = new Map()
// Objeto al que miran los ojos; se mueve suave hacia el cursor o la cámara
const gazeTarget = new Object3D()
const gazeGoal = new Vector3()

function initScene() {
  renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0) // fondo transparente: lo pinta el CSS
  container.value.appendChild(renderer.domElement)

  scene = new Scene()
  camera = new PerspectiveCamera(30, 1, 0.1, 20)
  scene.add(gazeTarget)

  // Luz principal, luz de cielo/suelo y luz de contorno (desde atrás)
  keyLight = new DirectionalLight(0xffffff, Math.PI)
  keyLight.position.set(1, 1.5, 2)
  hemiLight = new HemisphereLight(0xffffff, 0x888888, 1)
  rimLight = new DirectionalLight(0xffffff, 0)
  scene.add(keyLight, hemiLight, rimLight)
  applyLighting(props.lighting)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableDamping = true
  controls.minDistance = 0.5
  controls.maxDistance = 6
  controls.minPolarAngle = Math.PI / 4
  controls.maxPolarAngle = Math.PI / 1.8

  const canvas = renderer.domElement
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerCancel)

  timer = new Timer()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container.value)
  resize()
  render()
}

function resize() {
  const { clientWidth: w, clientHeight: h } = container.value
  if (!w || !h) return
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

// --- Iluminación del ambiente ---

function applyLighting(lighting) {
  if (!lighting || !keyLight) return
  const { key, rim } = lighting
  // Dirección: azimut 0 = de frente (lado de la cámara, +Z), positivo = desde la derecha
  const az = MathUtils.degToRad(key.azimuth)
  const el = MathUtils.degToRad(key.elevation)
  keyLight.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(3)
  keyLight.color.set(key.color)
  keyLight.intensity = key.intensity

  hemiLight.color.set(lighting.sky)
  hemiLight.groundColor.set(lighting.ground)
  hemiLight.intensity = lighting.hemi

  // Contorno: desde atrás y arriba, del lado contrario a la luz principal
  rimLight.position.set(-Math.sin(az) * 1.5, 1.5, -2.5)
  rimLight.color.set(rim.color)
  rimLight.intensity = rim.intensity
}

watch(() => props.lighting, applyLighting, { deep: true })

// --- Puntero: mirada, hover y clic ---

function setPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  pointerNdc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
}

/** Zona del cuerpo bajo el puntero (o null). */
function hitTest() {
  if (!interaction?.colliders.length) return null
  raycaster.setFromCamera(pointerNdc, camera)
  const hit = raycaster.intersectObjects(interaction.colliders, false)[0]
  return getTargetFromObjectName(hit?.object.name)
}

function onPointerMove(event) {
  pointerInside = true
  setPointer(event)
}

function onPointerLeave() {
  pointerInside = false
  hovering.value = false
}

function onPointerDown(event) {
  if (!event.isPrimary) return
  pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY }
}

function onPointerCancel() {
  pointerDown = null
}

function onPointerUp(event) {
  const start = pointerDown
  pointerDown = null
  // Arrastrar para rotar la cámara no cuenta como clic
  if (!start || start.id !== event.pointerId) return
  if (!isClickLike(start, { x: event.clientX, y: event.clientY })) return
  setPointer(event)
  const target = hitTest()
  if (!target) return

  const now = Date.now()
  if (now - (lastInteractionAt.get(target) ?? 0) < INTERACTION_COOLDOWN_MS) return
  lastInteractionAt.set(target, now)

  if (props.reactions) setEmotion(defaultReaction(target))
  emit('interact', target)
}

function updateGaze(delta) {
  if (pointerInside) {
    raycaster.setFromCamera(pointerNdc, camera)
    gazeGoal.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, GAZE_DISTANCE)
    hovering.value = Boolean(hitTest())
  } else {
    gazeGoal.copy(camera.position)
  }
  gazeTarget.position.lerp(gazeGoal, 1 - Math.exp(-8 * delta))
}

// --- Bucle de render ---

function render(timestamp) {
  frameId = requestAnimationFrame(render)
  timer.update(timestamp)
  const delta = Math.min(timer.getDelta(), 0.1)
  controls.update()
  // La animación no mueve todos los huesos (p. ej. la idle no toca el cuello): se parte del
  // reposo cada frame para que la pose procedural no se acumule
  if (vrm) resetPoseBones()
  mixer?.update(delta)
  if (vrm) {
    applyPose(procedural.update(delta, { voice: lipSync?.level() ?? 0, active: pointerInside }))
    updateGaze(delta)
    blink.update(vrm, delta, { suppress: emote?.affectsEyes() })
    lipSync?.update(vrm, delta)
    // Después del lip-sync: mientras habla, la emoción no toca la boca
    emote?.update(delta, { skipVisemes: lipSync?.isSpeaking() })
    vrm.update(delta)
  }
  renderer.render(scene, camera)
}

// --- Movimiento procedural (encima de la animación) ---

const _euler = new Euler()
const _quat = new Quaternion()
// Reparto de la pose entre huesos: [hueso, parte ('head' | 'spine'), peso]
const POSE_BONES = [
  ['spine', 'spine', 0.5],
  ['chest', 'spine', 0.5],
  ['neck', 'head', 0.4],
  ['head', 'head', 0.6],
]

function resetPoseBones() {
  for (const [bone] of POSE_BONES) {
    const rest = restPose.get(bone)
    if (rest) vrm.humanoid?.getNormalizedBoneNode(bone)?.quaternion.copy(rest)
  }
}

function applyPose(pose) {
  // Los VRM 0.x están girados 180°: en sus huesos el eje X y Z van al revés
  const s = vrm.meta?.metaVersion === '0' ? -1 : 1
  for (const [bone, part, w] of POSE_BONES) {
    const node = vrm.humanoid?.getNormalizedBoneNode(bone)
    if (!node) continue
    const pitch = part === 'head' ? pose.headPitch : pose.spinePitch
    const yaw = part === 'head' ? pose.headYaw : pose.spineYaw
    const roll = part === 'head' ? pose.headRoll : pose.spineRoll
    _euler.set(pitch * w * s, yaw * w, roll * w * s)
    node.quaternion.multiply(_quat.setFromEuler(_euler))
  }
}

/** Encuadra medio cuerpo (pecho y cabeza). */
function frameModel(size) {
  const headY = size.y * 0.88
  camera.position.set(0, headY, size.y * 0.95)
  controls.target.set(0, headY - size.y * 0.05, 0)
  controls.update()
  gazeTarget.position.copy(camera.position)
}

function unloadModel() {
  mixer?.stopAllAction()
  mixer = null
  idleAction = null
  oneShot = null
  clipCache.clear()
  emote?.dispose()
  emote = null
  interaction?.dispose()
  interaction = null
  disposeVrm(vrm)
  vrm = null
}

async function load(url) {
  status.value = 'loading'
  progress.value = 0
  unloadModel()

  try {
    const loaded = await loadVrm(url, (e) => {
      if (e.total) progress.value = Math.round((e.loaded / e.total) * 100)
    })
    if (url !== props.modelUrl) return disposeVrm(loaded.vrm) // cambió mientras cargaba
    vrm = loaded.vrm
    scene.add(vrm.scene)
    if (vrm.lookAt) vrm.lookAt.target = gazeTarget
    frameModel(loaded.size)
    emote = createEmote(vrm)
    interaction = createInteractionColliders(vrm)
    restPose = new Map(
      POSE_BONES.map(([bone]) => [bone, vrm.humanoid?.getNormalizedBoneNode(bone)?.quaternion.clone()]),
    )

    if (props.idleAnimationUrl) {
      const clip = await loadAnimationClip(props.idleAnimationUrl, vrm)
      if (clip && vrm) {
        mixer = createMixer()
        idleAction = mixer.clipAction(clip).setLoop(LoopRepeat, Infinity).play()
      }
    }
    status.value = 'ready'
  } catch (error) {
    console.error('[AvatarStage] Error al cargar el avatar:', error)
    errorMessage.value = `No se pudo cargar ${url}`
    status.value = 'error'
  }
}

async function attachAudio(audio) {
  try {
    if (!audioContext) audioContext = new AudioContext()
    if (audioContext.state === 'suspended') await audioContext.resume()
    if (!lipSync) lipSync = await createLipSync(audioContext)
    lipSync.connect(audio)
  } catch (error) {
    // Sin lip-sync el audio sigue sonando normal
    console.error('[AvatarStage] No se pudo conectar el lip-sync:', error)
  }
}

function setEmotion(name, options) {
  emote?.setEmotion(name, options)
  if (EMOTION_GESTURE[name]) procedural.trigger(EMOTION_GESTURE[name])
}

function playGesture(name) {
  procedural.trigger(name)
}

// --- Animaciones .vrma de una sola vez ---

function createMixer() {
  const m = new AnimationMixer(vrm.scene)
  // Al terminar una animación, volver suave a la de reposo
  m.addEventListener('finished', (e) => {
    if (e.action !== oneShot) return
    oneShot.fadeOut(0.5)
    oneShot = null
    idleAction?.reset().fadeIn(0.5).play()
  })
  return m
}

/** Reproduce un .vrma una vez (crossfade desde/hacia la animación en reposo). */
async function playAnimation(url) {
  if (!vrm) return
  const model = vrm
  let clip = clipCache.get(url)
  if (!clip) {
    clip = await loadAnimationClip(url, model)
    if (!clip || model !== vrm) return
    clipCache.set(url, clip)
  }
  mixer ??= createMixer()
  oneShot?.fadeOut(0.3)
  oneShot = mixer.clipAction(clip)
  oneShot.setLoop(LoopOnce, 1)
  oneShot.clampWhenFinished = true
  oneShot.reset().fadeIn(0.3).play()
  idleAction?.fadeOut(0.3)
}

defineExpose({ attachAudio, setEmotion, playGesture, playAnimation })

watch(() => props.modelUrl, (url) => load(url))

onMounted(() => {
  initScene()
  load(props.modelUrl)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  controls?.dispose()
  unloadModel()
  lipSync?.dispose()
  audioContext?.close()
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="container" class="absolute inset-0" :class="{ 'cursor-pointer': hovering }" />

    <div
      v-if="status !== 'ready'"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <p v-if="status === 'loading'" class="text-sm text-muted-foreground">
        Cargando avatar… {{ progress ? `${progress}%` : '' }}
      </p>
      <div v-else class="text-center text-sm text-muted-foreground px-6">
        <p>{{ errorMessage }}</p>
        <p class="mt-1">Coloca tu modelo en <code>public/avatars/avatar.vrm</code></p>
      </div>
    </div>
  </div>
</template>
