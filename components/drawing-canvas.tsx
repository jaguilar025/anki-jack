"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

interface DrawingCanvasProps {
  onImageCapture: (imageData: string) => void
  disabled?: boolean
}

export default function DrawingCanvas({ onImageCapture, disabled = false }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const container = canvas.parentElement
    if (container) {
      const size = Math.min(container.clientWidth, container.clientHeight) * 0.9
      canvas.width = size
      canvas.height = size
    }

    // Configure drawing context
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Fill with white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height)

    setContext(ctx)
  }, [])

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "#e5e5e5"
    ctx.lineWidth = 1

    // Draw grid lines
    const gridSize = 20
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw center lines (thicker)
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 2

    // Vertical center line
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()

    // Horizontal center line
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    // Reset stroke style for drawing
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 4
  }

  const getCoordinates = useCallback((event: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if (event instanceof MouseEvent) {
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      }
    } else {
      const touch = event.touches[0] || event.changedTouches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
  }, [])

  const startDrawing = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (disabled || !context) return

      event.preventDefault()
      setIsDrawing(true)

      const { x, y } = getCoordinates(event)
      context.beginPath()
      context.moveTo(x, y)
    },
    [context, disabled, getCoordinates],
  )

  const draw = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDrawing || disabled || !context) return

      event.preventDefault()
      const { x, y } = getCoordinates(event)
      context.lineTo(x, y)
      context.stroke()
    },
    [isDrawing, context, disabled, getCoordinates],
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Mouse events
    canvas.addEventListener("mousedown", startDrawing)
    canvas.addEventListener("mousemove", draw)
    canvas.addEventListener("mouseup", stopDrawing)
    canvas.addEventListener("mouseout", stopDrawing)

    // Touch events
    canvas.addEventListener("touchstart", startDrawing, { passive: false })
    canvas.addEventListener("touchmove", draw, { passive: false })
    canvas.addEventListener("touchend", stopDrawing)

    return () => {
      canvas.removeEventListener("mousedown", startDrawing)
      canvas.removeEventListener("mousemove", draw)
      canvas.removeEventListener("mouseup", stopDrawing)
      canvas.removeEventListener("mouseout", stopDrawing)
      canvas.removeEventListener("touchstart", startDrawing)
      canvas.removeEventListener("touchmove", draw)
      canvas.removeEventListener("touchend", stopDrawing)
    }
  }, [startDrawing, draw, stopDrawing])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !context) return

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid(context, canvas.width, canvas.height)
  }

  const captureDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    onImageCapture(imageData)
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex items-center justify-center w-full">
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-300 rounded-lg cursor-crosshair touch-none"
          style={{ minWidth: "100%", minHeight: "100%" }}
        />
      </div>

      <div className="flex flex-row justify-between w-full mt-20 mb-2">
        <Button onClick={clearCanvas} variant="outline" disabled={disabled}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
        <Button onClick={captureDrawing} disabled={disabled}>
          Confirmar dibujo
        </Button>
      </div>
    </div>
  )
}
