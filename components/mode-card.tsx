"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

interface ModeCardProps {
  title: string
  description: string
  icon: string
  isSelected: boolean
  onClick: () => void
}

export function ModeCard({ title, description, icon, isSelected, onClick }: ModeCardProps) {
  return (
    <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
      <Card
        className={`cursor-pointer card-hover-effect transition-all ${
          isSelected ? "border-primary border-2 bg-primary/10" : "border-border bg-card hover:border-primary/50"
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
          <div className="text-3xl mb-2">{icon}</div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
