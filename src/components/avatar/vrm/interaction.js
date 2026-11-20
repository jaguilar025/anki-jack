// Zonas del cuerpo clicables: cajas invisibles pegadas a los huesos del VRM.
// Adaptado de moeru-ai/airi (MIT), packages/stage-ui-three/src/composables/vrm/interaction.ts
// commit 32ffe96dc. Cambio: brazos y antebrazos se orientan hacia el hueso hijo
// (en el rig normalizado el brazo apunta a los lados, no hacia abajo; con las cajas
// verticales del original, al bajar los brazos la caja cruzaba el pecho).
import { Box3, BoxGeometry, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three'

const COLLIDER_NAME_PREFIX = 'vrm_interaction_'
const MAX_MODEL_SCALE = 1.5
const MIN_MODEL_SCALE = 0.65
const REFERENCE_MODEL_HEIGHT = 1.6

/**
 * Zonas: head, left/rightUpperArm, left/rightLowerArm, left/rightHand, left/rightFoot.
 * `to`: la caja va del hueso a ese hueso hijo, con grosor `thickness`.
 * `extend`: la caja sigue la dirección del hueso padre (p. ej. la mano continúa el antebrazo).
 * Si no: caja fija de tamaño `size` desplazada `offset`.
 */
const COLLIDER_DEFINITIONS = [
  { target: 'head', size: [0.2, 0.24, 0.22], offset: [0, 0.08, 0] },
  { target: 'leftUpperArm', to: 'leftLowerArm', thickness: 0.1 },
  { target: 'leftLowerArm', to: 'leftHand', thickness: 0.09 },
  { target: 'leftHand', extend: 0.14, thickness: 0.09 },
  { target: 'rightUpperArm', to: 'rightLowerArm', thickness: 0.1 },
  { target: 'rightLowerArm', to: 'rightHand', thickness: 0.09 },
  { target: 'rightHand', extend: 0.14, thickness: 0.09 },
  { target: 'leftFoot', size: [0.12, 0.12, 0.25], offset: [0, -0.04, 0.06] },
  { target: 'rightFoot', size: [0.12, 0.12, 0.25], offset: [0, -0.04, 0.06] },
]

const Y_AXIS = new Vector3(0, 1, 0)

function getModelScale(vrm) {
  const size = new Box3().setFromObject(vrm.scene).getSize(new Vector3())
  if (!Number.isFinite(size.y) || size.y <= 0) return 1
  return Math.min(MAX_MODEL_SCALE, Math.max(MIN_MODEL_SCALE, size.y / REFERENCE_MODEL_HEIGHT))
}

/** Crea las zonas clicables. Devuelve { colliders, dispose }. */
export function createInteractionColliders(vrm) {
  const material = new MeshBasicMaterial({ visible: false })
  const scale = getModelScale(vrm)
  const colliders = []

  for (const def of COLLIDER_DEFINITIONS) {
    const bone = vrm.humanoid?.getNormalizedBoneNode(def.target)
    if (!bone) continue
    const child = def.to && vrm.humanoid.getNormalizedBoneNode(def.to)
    let collider

    // Segmento: del hueso al hijo, o continuando la dirección en que viene el hueso
    const segment = child
      ? child.position.clone()
      : def.extend && bone.position.clone().setLength(def.extend * scale)
    if (segment) {
      const length = segment.length()
      const t = def.thickness * scale
      collider = new Mesh(new BoxGeometry(t, length, t), material)
      collider.position.copy(segment).multiplyScalar(0.5)
      collider.quaternion.copy(new Quaternion().setFromUnitVectors(Y_AXIS, segment.normalize()))
    } else if (def.size) {
      collider = new Mesh(
        new BoxGeometry(def.size[0] * scale, def.size[1] * scale, def.size[2] * scale),
        material,
      )
      collider.position.set(def.offset[0] * scale, def.offset[1] * scale, def.offset[2] * scale)
    } else {
      continue
    }

    collider.name = `${COLLIDER_NAME_PREFIX}${def.target}`
    bone.add(collider)
    colliders.push(collider)
  }

  return {
    colliders,
    dispose() {
      for (const c of colliders) {
        c.removeFromParent()
        c.geometry.dispose()
      }
      material.dispose()
      colliders.length = 0
    },
  }
}

/** "vrm_interaction_head" → "head" (o null si no es una zona). */
export function getTargetFromObjectName(name) {
  return name?.startsWith(COLLIDER_NAME_PREFIX) ? name.slice(COLLIDER_NAME_PREFIX.length) : null
}

/** Distingue un clic de un arrastre (rotar la cámara). */
export function isClickLike(start, end, maxDistance = 8) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return dx * dx + dy * dy <= maxDistance * maxDistance
}

/** Reacción por defecto de AIRI según la zona tocada. */
export function defaultReaction(target) {
  if (target === 'head') return 'happy'
  if (target === 'leftFoot' || target === 'rightFoot') return 'relaxed'
  return 'surprised'
}
