"use client"

import { motion } from "framer-motion"

interface ScoreDisplayProps {
  score: number
  lives: number
}

export function ScoreDisplay({ score, lives }: ScoreDisplayProps) {
  return (
    <div className="flex items-center gap-4">
      <motion.div
        className="text-sm font-bold"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.3 }}
        key={score}
      >
        Puntos: {score}
      </motion.div>
      <div className="flex">
        {Array.from({ length: lives }).map((_, i) => (
          <motion.div key={i} initial={{ opacity: 1 }} animate={{ opacity: i < lives ? 1 : 0.3 }} className="text-lg">
            ⭐
          </motion.div>
        ))}
      </div>
    </div>
  )
}
