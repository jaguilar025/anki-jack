export type Word = {
  japanese_advance: string // Kanji + kana
  japanese_basic: string // Solo kana
  spanish?: string
  english?: string
}

// Configuración personalizada del modo de práctica.
// `show`: qué pistas se muestran en la tarjeta (opción múltiple).
// `answer`: contra qué idioma se valida el input (opción única).
export type StudyShowOption = "audio" | "japanese" | "english"
export type StudyAnswerOption = "japanese" | "english"

export type StudyConfig = {
  show: StudyShowOption[]
  answer: StudyAnswerOption
}

export type Category = {
  [key: string]: Word[]
}

export type UserProgress = {
  [category: string]: {
    [mode: string]: {
      score: number
      completedWords?: string[]
    }
  }
}
