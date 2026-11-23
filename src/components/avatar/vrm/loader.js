// Carga de modelos VRM y animaciones VRMA.
// Adaptado de moeru-ai/airi (MIT), packages/stage-ui-three/src/composables/vrm/{loader,core}.ts
// commit 32ffe96dc
import { i18n } from '@/i18n'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import {
  VRMAnimationLoaderPlugin,
  VRMLookAtQuaternionProxy,
  createVRMAnimationClip,
} from '@pixiv/three-vrm-animation'
import { Box3, Vector3, VectorKeyframeTrack } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

let loader

function getLoader() {
  if (loader) return loader
  loader = new GLTFLoader()
  loader.crossOrigin = 'anonymous'
  loader.register((parser) => new VRMLoaderPlugin(parser))
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser))
  return loader
}

/**
 * Carga un .vrm y lo deja listo para la escena (mirando hacia la cámara en +Z).
 * @param {string} url
 * @param {(e: ProgressEvent) => void} [onProgress]
 */
export async function loadVrm(url, onProgress) {
  const gltf = await getLoader().loadAsync(url, onProgress)
  const vrm = gltf.userData.vrm
  if (!vrm) throw new Error(i18n.global.t('avatar.errors.vrmInvalid'))

  // Mejora el rendimiento
  VRMUtils.removeUnnecessaryVertices(vrm.scene)
  VRMUtils.combineSkeletons(vrm.scene)
  // Los VRM 0.x miran a -Z; los giramos para que todos miren a la cámara
  VRMUtils.rotateVRM0(vrm)

  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false
  })

  // Necesario para que las animaciones VRMA puedan mover la mirada
  if (vrm.lookAt) {
    const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt)
    proxy.name = 'lookAtQuaternionProxy'
    vrm.scene.add(proxy)
  }

  vrm.springBoneManager?.reset()

  const box = new Box3().setFromObject(vrm.scene)
  const size = new Vector3()
  box.getSize(size)

  return { vrm, size }
}

/** Carga la primera animación de un .vrma y la convierte en clip para el VRM dado. */
export async function loadAnimationClip(url, vrm) {
  const gltf = await getLoader().loadAsync(url)
  const animation = gltf.userData.vrmAnimations?.[0]
  if (!animation) return null
  const clip = createVRMAnimationClip(animation, vrm)
  reAnchorRootPositionTrack(clip, vrm)
  return clip
}

/**
 * Desplaza las pistas de posición para que la animación arranque en la posición
 * de la cadera del modelo (evita que el avatar "salte" o flote).
 */
function reAnchorRootPositionTrack(clip, vrm) {
  const hips = vrm.humanoid?.getNormalizedBoneNode('hips')
  if (!hips) return
  const hipsTrack = clip.tracks.find(
    (t) => t instanceof VectorKeyframeTrack && t.name === `${hips.name}.position`,
  )
  if (!hipsTrack) return

  const dx = hipsTrack.values[0] - hips.position.x
  const dy = hipsTrack.values[1] - hips.position.y
  const dz = hipsTrack.values[2] - hips.position.z
  for (const track of clip.tracks) {
    if (!(track instanceof VectorKeyframeTrack) || !track.name.endsWith('.position')) continue
    for (let i = 0; i < track.values.length; i += 3) {
      track.values[i] -= dx
      track.values[i + 1] -= dy
      track.values[i + 2] -= dz
    }
  }
}

export function disposeVrm(vrm) {
  if (!vrm) return
  vrm.scene.removeFromParent()
  VRMUtils.deepDispose(vrm.scene)
}
