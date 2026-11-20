// Parpadeo aleatorio.
// Adaptado de moeru-ai/airi (MIT), packages/stage-ui-three/src/composables/vrm/animation.ts (useBlink)
const BLINK_DURATION = 0.2
const MIN_INTERVAL = 1
const MAX_INTERVAL = 6

const nextInterval = () => Math.random() * (MAX_INTERVAL - MIN_INTERVAL) + MIN_INTERVAL

export function createBlink() {
  let blinking = false
  let progress = 0
  let sinceLast = 0
  let next = nextInterval()

  /** @param {{ suppress?: boolean }} [options] suppress: una emoción controla los ojos */
  function update(vrm, delta, { suppress = false } = {}) {
    if (!vrm?.expressionManager) return
    if (suppress) {
      // Abre el párpado y reinicia el ciclo para no quedar a medio cerrar
      if (blinking) vrm.expressionManager.setValue('blink', 0)
      blinking = false
      return
    }
    sinceLast += delta

    if (!blinking && sinceLast >= next) {
      blinking = true
      progress = 0
    }
    if (!blinking) return

    progress += delta / BLINK_DURATION
    vrm.expressionManager.setValue('blink', Math.sin(Math.PI * Math.min(progress, 1)))

    if (progress >= 1) {
      blinking = false
      sinceLast = 0
      next = nextInterval()
      vrm.expressionManager.setValue('blink', 0)
    }
  }

  return { update }
}
