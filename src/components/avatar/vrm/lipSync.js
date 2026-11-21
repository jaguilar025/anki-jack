// Lip-sync a partir del audio reproducido (wLipSync, análisis MFCC en un AudioWorklet).
// Adaptado de moeru-ai/airi (MIT):
//   packages/model-driver-lipsync/src/shared/wlipsync/vowel-driver.ts
//   packages/stage-ui-three/src/composables/vrm/lip-sync.ts
// commit 32ffe96dc
import { createWLipSyncNode } from 'wlipsync'
import profile from './wlipsync-profile.json'

const VOWELS = ['A', 'E', 'I', 'O', 'U']
const RAW_VISEMES = ['A', 'E', 'I', 'O', 'U', 'S']
const RAW_TO_VOWEL = { A: 'A', E: 'E', I: 'I', O: 'O', U: 'U', S: 'I' }
const VRM_EXPRESSION_BY_VOWEL = { A: 'aa', E: 'ee', I: 'ih', O: 'oh', U: 'ou' }

const emptyWeights = () => ({ A: 0, E: 0, I: 0, O: 0, U: 0 })

/** Convierte los frames de wLipSync en pesos de vocales suavizados. */
function createVowelDriver(now = () => performance.now()) {
  const smooth = emptyWeights()
  let lastActiveAt = 0

  function reset() {
    for (const v of VOWELS) smooth[v] = 0
    lastActiveAt = 0
  }

  function update(frame, delta = 0.016) {
    const amplitude = Math.min((frame.volume ?? 0) * 0.9, 1) ** 0.7
    const projected = emptyWeights()
    for (const raw of RAW_VISEMES) {
      const vowel = RAW_TO_VOWEL[raw]
      projected[vowel] = Math.max(projected[vowel], (frame.weights[raw] ?? 0) * amplitude)
    }

    // Solo las dos vocales más fuertes, para que la boca no "tiemble"
    let winner = 'I'
    let runner = 'E'
    let winnerWeight = -Infinity
    let runnerWeight = -Infinity
    for (const v of VOWELS) {
      const w = projected[v]
      if (w > winnerWeight) {
        runnerWeight = winnerWeight
        runner = winner
        winnerWeight = w
        winner = v
      } else if (w > runnerWeight) {
        runnerWeight = w
        runner = v
      }
    }

    const t = now()
    let silent = amplitude < 0.04 || winnerWeight < 0.05
    if (!silent) lastActiveAt = t
    if (t - lastActiveAt > 160) silent = true

    const target = emptyWeights()
    if (!silent) {
      target[winner] = Math.min(0.7, winnerWeight)
      target[runner] = Math.min(0.35, runnerWeight * 0.6)
    }

    const result = emptyWeights()
    for (const v of VOWELS) {
      const from = smooth[v]
      const to = target[v]
      const rate = 1 - Math.exp(-(to > from ? 50 : 30) * delta)
      smooth[v] = from + (to - from) * rate
      result[v] = (smooth[v] <= 0.01 ? 0 : smooth[v]) * 0.7
    }
    return result
  }

  return { reset, update }
}

/**
 * Crea el lip-sync para un AudioContext.
 * `connect(audioElement)` enruta el audio por el analizador (y a los altavoces)
 * y `update(vrm, delta)` aplica las vocales al modelo en cada frame.
 */
export async function createLipSync(audioContext) {
  const node = await createWLipSyncNode(audioContext, profile)
  const driver = createVowelDriver()
  let speaking = false
  let ownsMouth = false

  function clear(vrm) {
    if (!vrm?.expressionManager) return
    for (const v of VOWELS) vrm.expressionManager.setValue(VRM_EXPRESSION_BY_VOWEL[v], 0)
  }

  /** @param {HTMLAudioElement} audio */
  function connect(audio) {
    // Un HTMLAudioElement solo admite un MediaElementSource; cada audio de useAudio es nuevo.
    const source = audioContext.createMediaElementSource(audio)
    source.connect(audioContext.destination)
    source.connect(node)
    const onPlay = () => {
      speaking = true
      if (audioContext.state === 'suspended') audioContext.resume()
    }
    // useAudio nunca reanuda un audio pausado (stopAllAudio = pause + descartar),
    // así que pausa/fin/error liberan el nodo.
    const onStop = () => {
      speaking = false
      source.disconnect()
    }
    audio.addEventListener('play', onPlay)
    for (const ev of ['pause', 'ended', 'error']) audio.addEventListener(ev, onStop, { once: true })
  }

  /** Pesos de vocales { A, E, I, O, U } del frame actual, o null si no está hablando. */
  function vowels(delta) {
    if (!speaking) {
      driver.reset()
      return null
    }
    return driver.update(node, delta)
  }

  /** Aplica las vocales a un VRM (expresiones aa/ee/ih/oh/ou). */
  function update(vrm, delta) {
    if (!vrm?.expressionManager) return
    const weights = vowels(delta)
    if (!weights) {
      if (ownsMouth) {
        ownsMouth = false
        clear(vrm)
      }
      return
    }
    ownsMouth = true
    for (const v of VOWELS) vrm.expressionManager.setValue(VRM_EXPRESSION_BY_VOWEL[v], weights[v])
  }

  function dispose() {
    node.disconnect()
  }

  /** Volumen actual de la voz (0..1), 0 si no está hablando */
  const level = () => (speaking ? Math.min((node.volume ?? 0) * 0.9, 1) ** 0.7 : 0)

  return { connect, update, vowels, level, dispose, isSpeaking: () => speaking }
}
