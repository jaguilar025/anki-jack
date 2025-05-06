export type Word = {
  japanese_advance: string // Kanji + kana
  japanese_basic: string // Solo kana
  spanish: string
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
