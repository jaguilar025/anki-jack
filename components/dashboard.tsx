"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ModeCard } from "@/components/mode-card"
import { categories, getCustomCategories } from "@/lib/data"
import { ThemeToggle } from "@/components/theme-toggle"
import { DataManagement } from "@/components/data-management"
import { UploadStudyList } from "@/components/upload-study-list"
import { MessageCircle } from "lucide-react"


export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedMode, setSelectedMode] = useState<number | null>(null)
  const [availableCategories, setAvailableCategories] = useState<Record<string, any>>(categories)
  const router = useRouter()

  // Cargar categorías personalizadas al iniciar
  useEffect(() => {
    const customCategories = getCustomCategories()
    if (customCategories && Object.keys(customCategories).length > 0) {
      setAvailableCategories({ ...categories, ...customCategories })
    }
  }, [])

  const handleStart = () => {
    if (selectedCategory && selectedMode !== null) {
      router.push(`/study?category=${selectedCategory}&mode=${selectedMode}`)
    }
  }

  const handleGoStart = () => {
    window.location.replace("/");
    //router.push('/')
  }

  // Manejar cuando se carga una nueva lista de estudio
  const handleStudyListUploaded = (newCategories: Record<string, any>) => {
    setAvailableCategories({ ...categories, ...newCategories })
    // Resetear la selección actual
    setSelectedCategory("")
  }

  const categoryOptions = Object.keys(availableCategories)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-8"
    >
      <div className="flex justify-between items-center">
        <motion.h1
          className="text-2xl md:text-4xl font-bold text-primary cursor-pointer"
          onClick={()=>handleGoStart()}
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          START AGAIN
        </motion.h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <DataManagement />
          <UploadStudyList onUpload={handleStudyListUploaded} />
        </div>
      </div>

      <Card className="bg-secondary/50 backdrop-blur-sm border-primary/20">
        <CardContent className="p-6">
          <h2 className="text-lg mb-6 text-center">Panel de Control</h2>

          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Selecciona una categoría</label>
              <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Selecciona un modo de estudio</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModeCard
                  title="Audio + Escritura"
                  description="Escucha y escribe la palabra en japonés"
                  icon="🎧"
                  isSelected={selectedMode === 0}
                  onClick={() => setSelectedMode(0)}
                />
                <ModeCard
                  title="Visual + Audio"
                  description="Lee y escucha la palabra en japonés"
                  icon="👁️"
                  isSelected={selectedMode === 1}
                  onClick={() => setSelectedMode(1)}
                />
                <ModeCard
                  title="Traducción"
                  description="Traduce del español al japonés"
                  icon="🔄"
                  isSelected={selectedMode === 2}
                  onClick={() => setSelectedMode(2)}
                />
              </div>
            </div>

            <Button
              onClick={handleStart}
              disabled={!selectedCategory || selectedMode === null}
              className="w-full"
              size="lg"
            >
              Iniciar Estudio
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/50 backdrop-blur-sm border-primary/20">
        <CardContent className="p-6">
          <h2 className="text-lg mb-6 text-center">Práctica de Conversación</h2>

          <div className="flex flex-col gap-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Practica tus habilidades de conversación en japonés con un asistente de IA
              </p>

              <Button onClick={() => router.push(`/conversation`)} className="w-full" size="lg" variant="outline">
                <MessageCircle className="mr-2 h-5 w-5" />
                Iniciar Conversación
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>Progreso guardado automáticamente en tu dispositivo</p>
        <p>Copyright © All rights reserved | ELNEA</p>
      </div>
    </motion.div>
  )
}
