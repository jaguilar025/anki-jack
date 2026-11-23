// Comandos del chat con avatar: si el mensaje coincide con un comando, se ejecuta la acción en
// lugar de enviarlo a la IA (no gasta una llamada). La comparación ignora mayúsculas, signos y
// espacios de más: "Dance Go Wild!" = "dance go wild".
//
// Para agregar uno: { id, phrases: ['texto del comando', …], action: { type, … }, formats, background? }
//   action.type 'animation' → reproduce un .vrma (url en public/)
//   formats: tipos de avatar compatibles ('vrm' | 'live2d')
//   background (opcional): video de fondo SOLO mientras dura la acción; al terminar vuelve el
//     fondo que había. Dos opciones:
//     - { video: '/ruta/en/public.mp4', volume, muted, offset } → video local: se precarga y la
//       animación sigue su reloj (sincronización exacta). offset: segundos que se adelanta (+) o
//       atrasa (−) el baile respecto al video. Termina cuando acaba el video o el baile.
//     - { youtube: url, volume, muted } → YouTube (sincronización aproximada). Los Shorts se
//       escalan como video vertical.

export const CHAT_COMMANDS = [
  {
    id: 'dance-go-wild',
    label: 'Go Wild',
    phrases: ['dance go wild'],
    // Baile de Maron Yatsuhashi (Booth); su licencia prohíbe redistribuirlo: está en .gitignore
    action: { type: 'animation', url: '/avatars/animations/go-wild.vrma' },
    // Video del Short (youtube.com/shorts/B3YRHBhQtf4) descargado para uso local: en .gitignore
    // offset 1.1: el archivo del baile trae 1.1 s de más al inicio respecto al video (ajustado a ojo)
    background: { video: '/avatars/videos/go-wild.mp4', volume: 100, muted: false, offset: 1.1 },
    formats: ['vrm'],
  },
]

/** Minúsculas, sin signos ni espacios de más (conserva letras y números de cualquier idioma) */
export const normalizeCommand = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** Comando que coincide exactamente con el texto, o null */
export function findChatCommand(text) {
  const normalized = normalizeCommand(text)
  if (!normalized) return null
  return CHAT_COMMANDS.find((c) => c.phrases.some((p) => normalizeCommand(p) === normalized)) ?? null
}
