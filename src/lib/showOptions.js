// Opciones de "Mostrar" del modo de práctica (Dashboard), compartidas por Study y la tabla
// de Consult. Viajan en la URL como `show=audio,kanji,furigana,english`.

export const SHOW_OPTIONS = ['audio', 'kanji', 'furigana', 'english']

/**
 * Lee el parámetro `show` de la URL. El antiguo 'japanese' equivale a 'kanji' + 'furigana'.
 * @param {string | null | undefined} param
 * @returns {string[]} opciones válidas, sin repetir
 */
export function parseShowParam(param) {
  return [
    ...new Set(
      (param?.split(',') ?? [])
        .flatMap((s) => (s === 'japanese' ? ['kanji', 'furigana'] : [s]))
        .filter((s) => SHOW_OPTIONS.includes(s)),
    ),
  ]
}
