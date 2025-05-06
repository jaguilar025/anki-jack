import type { UserProgress } from "./types"

const STORAGE_KEY = "nihongo-study-progress"

export function getUserProgress(): UserProgress {
  if (typeof window === "undefined") return {}

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return {}

  try {
    return JSON.parse(stored) as UserProgress
  } catch (error) {
    console.error("Error parsing progress data:", error)
    return {}
  }
}

export function setUserProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return

  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function updateUserProgress(category: string, mode: string, points: number): void {
  const progress = getUserProgress()

  if (!progress[category]) {
    progress[category] = {}
  }

  if (!progress[category][mode]) {
    progress[category][mode] = { score: 0 }
  }

  progress[category][mode].score += points

  setUserProgress(progress)
}

export function clearUserProgress(): void {
  if (typeof window === "undefined") return

  localStorage.removeItem(STORAGE_KEY)
}
