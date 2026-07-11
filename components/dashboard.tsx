"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { ModeCard } from "@/components/mode-card"
import { CategoryWheel } from "@/components/category-wheel"
import { categories, getCustomCategories } from "@/lib/data"
import { ThemeToggle } from "@/components/theme-toggle"
import { DataManagement } from "@/components/data-management"
import { UploadStudyList } from "@/components/upload-study-list"
import type { StudyAnswerOption, StudyShowOption } from "@/lib/types"


export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [availableCategories, setAvailableCategories] = useState<Record<string, any>>(categories)
  // Configuración personalizada del modo de práctica. Por defecto: mostrar
  // japonés + audio y validar la respuesta en inglés (equivale al antiguo modo 3).
  const [showOptions, setShowOptions] = useState<Record<StudyShowOption, boolean>>({
    audio: true,
    japanese: true,
    english: false,
  })
  const [answerOption, setAnswerOption] = useState<StudyAnswerOption>("english")
  const [timerSeconds, setTimerSeconds] = useState<number>(45)
  const router = useRouter()

  const selectedShow = (Object.keys(showOptions) as StudyShowOption[]).filter((k) => showOptions[k])

  // Cargar categorías personalizadas al iniciar
  useEffect(() => {
    const customCategories = getCustomCategories()
    if (customCategories && Object.keys(customCategories).length > 0) {
      setAvailableCategories({ ...categories, ...customCategories })
    }
  }, [])

  const toggleShow = (key: StudyShowOption) => {
    setShowOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleStart = () => {
    if (!selectedCategory || selectedShow.length === 0) return
    const params = new URLSearchParams({
      category: selectedCategory,
      show: selectedShow.join(","),
      answer: answerOption,
      time: String(timerSeconds > 0 ? timerSeconds : 45),
    })
    router.push(`/study?${params.toString()}`)
  }
  const handleGoLens = () => {
    router.push(`/dict-lens`)
  }

  const handleGoStart = () => {
    window.location.replace("/");
    //router.push('/')
  }
  const handleGoDrawLens = () => {
    router.push(`/draw-kanji`)
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
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button variant="outline" onClick={() => handleGoStart()}>
            <RotateCcw className="mr-2 h-[1.2rem] w-[1.2rem]" />
            START AGAIN
          </Button>
        </motion.div>
        <div className="flex gap-2">
          <ThemeToggle />
          <DataManagement />
          <UploadStudyList onUpload={handleStudyListUploaded} />
        </div>
      </div>

      <Card className="bg-secondary/50 backdrop-blur-sm border-primary/20">
        <CardContent className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch">
            <CategoryWheel
              options={categoryOptions}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />

            <div className="flex flex-col gap-6">
              <label className="text-sm text-muted-foreground">Modo de práctica</label>

              <div className="space-y-3">
                <p className="text-sm font-medium">Mostrar:</p>
                <div className="space-y-3 pl-1">
                  {(
                    [
                      { key: "audio", label: "Audio" },
                      { key: "japanese", label: "Japonés" },
                      { key: "english", label: "Inglés" },
                    ] as { key: StudyShowOption; label: string }[]
                  ).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`show-${key}`}
                        checked={showOptions[key]}
                        onCheckedChange={() => toggleShow(key)}
                      />
                      <Label htmlFor={`show-${key}`} className="cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Respuesta:</p>
                <RadioGroup
                  value={answerOption}
                  onValueChange={(v) => setAnswerOption(v as StudyAnswerOption)}
                  className="space-y-3 pl-1"
                >
                  {(
                    [
                      { key: "japanese", label: "Japonés" },
                      { key: "english", label: "Inglés" },
                    ] as { key: StudyAnswerOption; label: string }[]
                  ).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <RadioGroupItem id={`answer-${key}`} value={key} />
                      <Label htmlFor={`answer-${key}`} className="cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timer" className="text-sm font-medium">
                  Temporizador (segundos)
                </Label>
                <Input
                  id="timer"
                  type="number"
                  min={5}
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(Number(e.target.value))}
                  className="w-32"
                />
              </div>

              <Button
                onClick={handleStart}
                disabled={!selectedCategory || selectedShow.length === 0}
                className="w-full"
                size="lg"
              >
                Iniciar Estudio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/50 backdrop-blur-sm border-primary/20">
        <CardContent className="p-6">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ModeCard
              title="Conversación"
              description="conversación con un asistente de IA"
              icon="💬"
              isSelected={false}
              onClick={() => router.push(`/conversation`)}
            />
            <ModeCard
              title="Kanji Lens"
              description="Captura kanjis"
              icon="📷"
              isSelected={false}
              onClick={() => handleGoLens()}
            />
            <ModeCard
              title="Kanji Lens"
              description="Dibuja kanjis"
              icon="✏️"
              isSelected={false}
              onClick={() => handleGoDrawLens()}
            />
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
