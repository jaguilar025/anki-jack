// Movimiento procedural (sin archivos de animación), común a VRM y Live2D:
//  - al hablar: la cabeza asiente/ladea y el cuerpo se balancea con el volumen de la voz
//  - gestos: asentir, negar, ladear la cabeza, sorprenderse, etc. (también por emoción)
//  - en reposo: de vez en cuando mira alrededor
// Devuelve una "pose" en radianes que cada visor aplica a su modelo (huesos o parámetros).
// Convención: pitch > 0 = mirar abajo / inclinarse adelante; yaw > 0 = girar a su izquierda
// (derecha de la pantalla); roll > 0 = ladear hacia su izquierda.

export const GESTURES = {
  nod: { label: 'Asentir', duration: 1.0 },
  shake: { label: 'Negar', duration: 1.2 },
  tilt: { label: 'Ladear la cabeza', duration: 2.4 },
  leanBack: { label: 'Sorprenderse', duration: 1.1 },
  droop: { label: 'Agachar la cabeza', duration: 2.4 },
  lookAround: { label: 'Mirar alrededor', duration: 3.4 },
  bow: { label: 'Reverencia', duration: 2.0 },
}

/** Gesto que acompaña a cada emoción de la IA */
export const EMOTION_GESTURE = {
  happy: 'nod',
  sad: 'droop',
  angry: 'shake',
  surprised: 'leanBack',
  think: 'tilt',
  relaxed: 'tilt',
}

export const EMOTION_LABELS = {
  happy: 'Feliz',
  sad: 'Triste',
  angry: 'Enojo',
  surprised: 'Sorpresa',
  relaxed: 'Relajado',
  think: 'Pensativo',
}

const TAU = Math.PI * 2
const smooth = (x) => x * x * (3 - 2 * x)
/** 0 → 1 (entrada) … 1 (sostenido) … → 0 (salida) */
const hold = (p, edge = 0.2) => (p < edge ? smooth(p / edge) : p > 1 - edge ? smooth((1 - p) / edge) : 1)
const bell = (p) => Math.sin(Math.PI * p)

/** Curvas de cada gesto: p = progreso 0..1 → partes de la pose */
const CURVES = {
  nod: (p) => ({ headPitch: 0.16 * (1 - Math.cos(TAU * 2 * p)) * 0.5 }),
  shake: (p) => ({ headYaw: 0.22 * Math.sin(TAU * 2 * p) * bell(p) }),
  tilt: (p) => ({ headRoll: 0.18 * hold(p), headYaw: 0.06 * hold(p) }),
  leanBack: (p) => ({ spinePitch: -0.1 * bell(p), headPitch: -0.1 * bell(p) }),
  droop: (p) => ({ headPitch: 0.24 * hold(p), spinePitch: 0.05 * hold(p) }),
  lookAround: (p) => ({ headYaw: 0.32 * Math.sin(TAU * p) * hold(p, 0.15), headPitch: -0.03 * bell(p) }),
  bow: (p) => ({ spinePitch: 0.32 * hold(p, 0.3), headPitch: 0.15 * hold(p, 0.3) }),
}

const ZERO_POSE = { headPitch: 0, headYaw: 0, headRoll: 0, spinePitch: 0, spineYaw: 0, spineRoll: 0 }

export function createProceduralMotion() {
  let t = 0
  let level = 0 // volumen de voz suavizado (0..1)
  let gesture = null // { name, elapsed, duration }
  let idleFor = 0
  let nextLookAround = 10 + Math.random() * 10

  function trigger(name) {
    if (!CURVES[name]) return
    gesture = { name, elapsed: 0, duration: GESTURES[name].duration }
  }

  /**
   * @param {number} delta segundos
   * @param {{ voice?: number, active?: boolean }} input
   *   voice: volumen actual de la voz (0..1); active: el usuario está interactuando (mouse)
   */
  function update(delta, { voice = 0, active = false } = {}) {
    t += delta
    level += (Math.min(1, voice * 2) - level) * (1 - Math.exp(-10 * delta))
    const pose = { ...ZERO_POSE }

    // Al hablar: pequeños asentimientos irregulares y balanceo
    if (level > 0.01) {
      pose.headPitch += level * (0.05 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 3.1 + 1))
      pose.headRoll += level * 0.04 * Math.sin(t * 2.3)
      pose.headYaw += level * 0.03 * Math.sin(t * 1.9 + 2)
      pose.spineYaw += level * 0.03 * Math.sin(t * 1.7)
    }

    // En reposo: mirar alrededor de vez en cuando
    idleFor = level > 0.05 || active || gesture ? 0 : idleFor + delta
    if (idleFor > nextLookAround) {
      trigger('lookAround')
      idleFor = 0
      nextLookAround = 12 + Math.random() * 12
    }

    if (gesture) {
      gesture.elapsed += delta
      const p = Math.min(1, gesture.elapsed / gesture.duration)
      for (const [k, v] of Object.entries(CURVES[gesture.name](p))) pose[k] += v
      if (p >= 1) gesture = null
    }
    return pose
  }

  return { trigger, update }
}
