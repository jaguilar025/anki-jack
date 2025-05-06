"use client"

import { Button } from "@/components/ui/button"
import { Download, Upload, Trash } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getUserProgress, setUserProgress, clearUserProgress } from "@/lib/storage"
import { clearCustomCategories } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"

export function DataManagement() {
  const { toast } = useToast()

  const handleExport = () => {
    const progress = getUserProgress()
    const dataStr = JSON.stringify(progress)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = "nihongo-study-progress.json"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    toast({
      title: "Progreso exportado",
      description: "Se ha descargado el archivo con tu progreso",
      variant: "success",
    })
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (!target.files?.length) return

      const file = target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const progress = JSON.parse(event.target?.result as string)
          setUserProgress(progress)

          toast({
            title: "Progreso importado",
            description: "Se ha cargado tu progreso correctamente",
            variant: "success",
          })

          window.location.reload()
        } catch (error) {
          console.error("Error importing data:", error)

          toast({
            title: "Error al importar datos",
            description: "Formato incorrecto o archivo dañado",
            variant: "destructive",
          })
        }
      }

      reader.readAsText(file)
    }

    input.click()
  }

  const handleClearData = () => {
    if (
      confirm(
        "¿Estás seguro de que quieres eliminar todo tu progreso y listas personalizadas? Esta acción no se puede deshacer.",
      )
    ) {
      clearUserProgress()
      clearCustomCategories()

      toast({
        title: "Datos eliminados",
        description: "Se ha eliminado todo tu progreso y listas personalizadas",
        variant: "success",
      })

      window.location.reload()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Download className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Gestionar datos</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          <span>Exportar progreso</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleImport}>
          <Upload className="mr-2 h-4 w-4" />
          <span>Importar progreso</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleClearData} className="text-destructive">
          <Trash className="mr-2 h-4 w-4" />
          <span>Eliminar datos</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
