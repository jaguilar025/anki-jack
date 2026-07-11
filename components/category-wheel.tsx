"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface CategoryWheelProps {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function CategoryWheel({ options, value, onChange }: CategoryWheelProps) {
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])
  const [query, setQuery] = useState("")

  const scrollIntoView = (index: number) => {
    itemsRef.current[index]?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }

  const handleSelect = (option: string, index: number) => {
    if (option !== value) onChange(option)
    scrollIntoView(index)
  }

  // Busca la coincidencia más cercana: primero por prefijo, luego por
  // inclusión, la selecciona y la trae a la vista.
  const handleSearch = (raw: string) => {
    setQuery(raw)
    const q = raw.trim().toLowerCase()
    if (!q) return
    const lowered = options.map((o) => o.toLowerCase())
    let idx = lowered.findIndex((o) => o.startsWith(q))
    if (idx === -1) idx = lowered.findIndex((o) => o.includes(q))
    if (idx === -1) return
    handleSelect(options[idx], idx)
  }

  // Al fijar el valor desde fuera, trae la opción seleccionada a la vista.
  useEffect(() => {
    const idx = value ? options.indexOf(value) : -1
    if (idx >= 0) scrollIntoView(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options])

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar..."
          className="pl-9"
        />
      </div>

      {/* Wrapper que ocupa el espacio restante. En desktop la lista va en
          absolute para no aportar altura y así la fila del grid la define la
          columna de ModeCards; en móvil usa una altura fija. */}
      <div className="relative h-64 min-h-0 md:h-auto md:flex-1">
        <div className="absolute inset-0 overflow-y-auto rounded-lg border border-border/50 bg-background/30 p-1">
          <div className="flex flex-col gap-1">
            {options.map((option, i) => {
              const isSelected = option === value
              return (
                <button
                  key={option}
                  ref={(el) => {
                    itemsRef.current[i] = el
                  }}
                  type="button"
                  onClick={() => handleSelect(option, i)}
                  className={`w-full rounded-md px-3 py-2 text-center text-base transition-colors ${
                    isSelected
                      ? "border-y-2 border-primary/60 bg-primary/5 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span className="block truncate">{option}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
