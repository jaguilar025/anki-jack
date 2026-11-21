// Expresiones (emociones) con transición suave y vuelta a neutral.
// Basado en moeru-ai/airi (MIT), packages/stage-ui-three/src/composables/vrm/expression.ts
// commit 32ffe96dc. Mismas emociones y pesos; la transición se simplificó a un
// suavizado exponencial por frame en lugar del lerp por fases del original.

// Pesos < 1 a propósito: con 1.0 los modelos "sonríen demasiado" (airi #590)
const EMOTIONS = {
  happy: { expression: { happy: 0.7, aa: 0.2 }, blend: 0.4 },
  sad: { expression: { sad: 0.7, oh: 0.15 }, blend: 0.4 },
  angry: { expression: { angry: 0.7, ee: 0.3 }, blend: 0.3 },
  surprised: { expression: { surprised: 0.8, oh: 0.4 }, blend: 0.15 },
  relaxed: { expression: { relaxed: 0.7 }, blend: 0.4 },
  think: { expression: { think: 0.7 }, blend: 0.5 },
  neutral: { expression: {}, blend: 0.6 },
}

// La boca la controla el lip-sync mientras habla
const VISEMES = new Set(['aa', 'ee', 'ih', 'oh', 'ou'])

export const EMOTION_NAMES = Object.keys(EMOTIONS)

export function createEmote(vrm) {
  const manager = vrm.expressionManager
  // Nombre real en el modelo (sin distinguir mayúsculas) de cada expresión usada
  const modelNames = manager ? Object.keys(manager.expressionMap) : []
  const resolve = (name) => modelNames.find((n) => n.toLowerCase() === name.toLowerCase())
  const owned = [
    ...new Set(
      Object.values(EMOTIONS)
        .flatMap((e) => Object.keys(e.expression))
        .map(resolve)
        .filter(Boolean),
    ),
  ]

  const current = new Map(owned.map((n) => [n, 0]))
  const target = new Map(owned.map((n) => [n, 0]))
  let blend = 0.6
  let resetTimer = null
  let active = false

  function setEmotion(name, { intensity = 1, resetAfter = 3000 } = {}) {
    const emotion = EMOTIONS[name]
    if (!emotion || !manager) return
    clearTimeout(resetTimer)
    const k = Math.min(1, Math.max(0, intensity))
    for (const n of owned) target.set(n, 0)
    for (const [expr, value] of Object.entries(emotion.expression)) {
      const real = resolve(expr)
      if (real) target.set(real, value * k)
    }
    blend = emotion.blend
    active = true
    if (name !== 'neutral' && resetAfter > 0) {
      resetTimer = setTimeout(() => setEmotion('neutral'), resetAfter)
    }
  }

  /** @param {{ skipVisemes?: boolean }} [options] */
  function update(delta, { skipVisemes = false } = {}) {
    if (!active || !manager) return
    // Suavizado exponencial: ~95 % del camino en `blend` segundos
    const rate = 1 - Math.exp((-3 * delta) / blend)
    let settled = true
    for (const n of owned) {
      const to = target.get(n)
      let value = current.get(n) + (to - current.get(n)) * rate
      if (Math.abs(to - value) < 0.001) value = to
      else settled = false
      current.set(n, value)
      if (skipVisemes && VISEMES.has(n.toLowerCase())) continue
      manager.setValue(n, value)
    }
    // Ya en neutral y quieto: suelta el control de las expresiones
    if (settled && [...target.values()].every((v) => v === 0)) active = false
  }

  /** true si la emoción afecta los ojos (para pausar el parpadeo). */
  function affectsEyes() {
    for (const [n, v] of current) if (v > 0.05 && !VISEMES.has(n.toLowerCase())) return true
    return false
  }

  function dispose() {
    clearTimeout(resetTimer)
  }

  return { setEmotion, update, affectsEyes, dispose }
}
