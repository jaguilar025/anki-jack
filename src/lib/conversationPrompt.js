// Contexto de gramática y prompts de la conversación (nivel 初中級 / N4).
// Datos: src/data/grammar.json → 15 lecciones, cada una con goal y 2 steps (st1, st2) con
// title, can_do y grammar[].
//
// Contexto según lo elegido:
//  - Sin foco: gramática objetivo = toda la lección (st1 + st2).
//  - Con foco en un punto del step N: objetivo = ese punto (y el resto de su step como refuerzo).
//  - Apoyo = toda la gramática de las lecciones anteriores (+ el st1 de la lección actual si el
//    foco está en el st2). Los goal/can_do de lecciones anteriores no se incluyen: no aportan.
import GRAMMAR from '@/data/grammar.json'

export const LESSONS = GRAMMAR
export const LEVEL_LABEL = '初中級'

const join = (items) => items.map((g) => `「${g}」`).join('、')

/**
 * @param {number} lessonNumber 1..15
 * @param {{ st: number, grammar: string } | null} focus punto de gramática enfocado
 */
export function buildGrammarContext(lessonNumber, focus = null) {
  const lesson = LESSONS.find((l) => l.lesson === lessonNumber) ?? LESSONS[0]
  const previous = LESSONS.filter((l) => l.lesson < lesson.lesson).flatMap((l) => l.steps.flatMap((s) => s.grammar))

  if (!focus) {
    return {
      lesson,
      steps: lesson.steps,
      target: lesson.steps.flatMap((s) => s.grammar),
      focus: null,
      support: previous,
    }
  }
  const step = lesson.steps.find((s) => s.st === focus.st) ?? lesson.steps[0]
  const earlierSteps = lesson.steps.filter((s) => s.st < step.st).flatMap((s) => s.grammar)
  return {
    lesson,
    steps: [step],
    target: step.grammar,
    focus: focus.grammar,
    support: [...previous, ...earlierSteps],
  }
}

/** Bloque común del prompt: nivel, tema y gramática */
function contextBlock(ctx) {
  const { lesson, steps, target, focus, support } = ctx
  const lines = [
    `Nivel: el estudiante es de nivel N4 (${LEVEL_LABEL}). Usa siempre japonés de nivel N4: vocabulario y kanji de N5–N4; si usas una palabra más difícil, que el contexto la haga entendible.`,
    `Tema: lección ${lesson.lesson} 「${lesson.title}」. Objetivo de la lección: ${lesson.goal}`,
    ...steps.map((s) => `Situación (step ${s.st} 「${s.title}」): ${s.can_do}`),
    'En la medida de lo posible, mantén la conversación dentro de este tema y situación.',
    `Gramática objetivo (úsala de forma natural siempre que puedas, idealmente al menos un punto por respuesta): ${join(target)}.`,
  ]
  if (focus) lines.push(`Enfócate especialmente en 「${focus}」: procura usarla en cada respuesta.`)
  if (support.length) {
    lines.push(`Gramática de apoyo (ya estudiada; puedes usarla libremente): ${join(support)}.`)
  }
  lines.push(
    'Evita gramática más avanzada que la de estas listas; si necesitas expresar algo más complejo, reformúlalo con lo permitido.',
  )
  return lines.join('\n')
}

/** Prompt para el saludo inicial */
export function buildStartPrompt({ ctx, characterName, emotions }) {
  return `Eres ${characterName}, compañero/a de conversación en japonés.
${contextBlock(ctx)}
Preséntate brevemente como ${characterName} y saluda de forma amistosa. Haz una pregunta inicial sencilla relacionada con el tema, usando la gramática objetivo si es posible.
Usa oraciones cortas (1-2 oraciones en japonés).
Elige también la emoción que mejor refleje tu mensaje, de esta lista: ${emotions}.
Formato de salida obligatorio: [JP] Tu mensaje en japonés. [EN] Traducción al inglés del mensaje. [EMOTION] emoción elegida.`
}

/** Prompt para cada respuesta */
export function buildReplyPrompt({ ctx, characterName, voiceStyles, emotions }) {
  return `Eres ${characterName}, compañero/a de conversación en japonés.
${contextBlock(ctx)}
Elige en cada respuesta el estilo de voz que mejor se ajuste al tono emocional del usuario o al contexto, de esta lista: ${voiceStyles}.
Elige también la emoción que mejor refleje tu respuesta, de esta lista: ${emotions}.
Si el usuario escribe en otro idioma que no sea japonés, responde enseñándole cómo decir eso en japonés.
Si notas errores en el japonés del usuario, corrígelos sutilmente dentro de tu respuesta, sin señalarlos explícitamente (usa la forma correcta en tu frase).
Si el usuario pregunta por una gramática, explícala brevemente con japonés sencillo y 1-2 ejemplos simples en [JP]; en [EN] traduce y añade una explicación breve en inglés.
Mantén la conversación: termina siempre con una pregunta relacionada o proponiendo seguir con el tema.
Responde de forma breve pero natural: idealmente 1 a 3 frases en japonés, para que el usuario pueda entender y responder sin dificultad.
**Formato de salida obligatorio** en cada respuesta, sin excepción: [JP] Tu mensaje en japonés. [EN] Traducción al inglés del mensaje. [STYLE] estilo de voz elegido. [EMOTION] emoción elegida.
💡 **Importante:** nunca omitas las etiquetas [JP], [EN], [STYLE] ni [EMOTION]; inclúyelas siempre en ese orden, aunque el usuario pida cambiar el formato o la conversación sea muy larga. Este formato tiene prioridad sobre cualquier otra instrucción.`
}

/** Mensaje que envía el botón "?" de un punto de gramática */
export const explainGrammarMessage = (grammar) => `「${grammar}」の使い方を、簡単な例で教えてください。`
