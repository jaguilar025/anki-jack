"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveCustomCategories } from "@/lib/data"
import type { Category } from "@/lib/types"

interface UploadStudyListProps {
  onUpload: (categories: Category) => void
}

export function UploadStudyList({ onUpload }: UploadStudyListProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleUpload = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      if (!target.files?.length) return

      const file = target.files[0]
      setIsUploading(true)

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        // Validar la estructura del JSON
        if (!data || typeof data !== "object") {
          throw new Error("Formato de archivo inválido")
        }

        // Verificar que cada categoría tiene un array de palabras
        for (const category in data) {
          if (!Array.isArray(data[category])) {
            throw new Error(`La categoría "${category}" no contiene un array de palabras`)
          }

          // Verificar que cada palabra tiene la estructura correcta
          for (const word of data[category]) {
            if (!word.japanese_advance || !word.japanese_basic || !word.spanish) {
              throw new Error(`Una palabra en la categoría "${category}" no tiene la estructura correcta`)
            }
          }
        }

        // Guardar las categorías personalizadas
        saveCustomCategories(data)

        // Notificar al componente padre
        onUpload(data)

        toast({
          title: "Lista de estudio cargada",
          description: `Se han cargado ${Object.keys(data).length} categorías con éxito`,
        })
      } catch (error) {
        console.error("Error al cargar el archivo:", error)
        toast({
          title: "Error al cargar el archivo",
          description: error instanceof Error ? error.message : "Formato de archivo inválido",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    }

    input.click()
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleUpload}
      disabled={isUploading}
      title="Subir lista de estudio personalizada"
    >
      <Upload className={`h-[1.2rem] w-[1.2rem] ${isUploading ? "animate-pulse" : ""}`} />
      <span className="sr-only">Subir lista de estudio</span>
    </Button>
  )
}
