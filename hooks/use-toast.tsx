"use client"

import { useState, useEffect } from "react"

type ToastVariant = "default" | "destructive" | "success"

interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface Toast extends ToastProps {
  id: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, variant = "default", duration = 5000 }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, variant, duration }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)

    return id
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Render toasts in a portal
  useEffect(() => {
    if (typeof document === "undefined") return

    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container")
    if (!toastContainer) {
      toastContainer = document.createElement("div")
      toastContainer.id = "toast-container"
      toastContainer.className = "fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md"
      document.body.appendChild(toastContainer)
    }

    // Render toasts
    toastContainer.innerHTML = ""
    toasts.forEach((t) => {
      const toast = document.createElement("div")
      toast.className = `p-4 rounded-lg shadow-lg transition-all transform translate-y-0 opacity-100 ${
        t.variant === "destructive"
          ? "bg-destructive text-destructive-foreground"
          : t.variant === "success"
            ? "bg-green-600 text-white"
            : "bg-secondary text-secondary-foreground"
      }`

      toast.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-medium">${t.title}</h3>
            ${t.description ? `<p class="text-sm opacity-90">${t.description}</p>` : ""}
          </div>
          <button class="ml-4 text-sm opacity-70 hover:opacity-100">×</button>
        </div>
      `

      // Add click handler to dismiss button
      const dismissBtn = toast.querySelector("button")
      if (dismissBtn) {
        dismissBtn.onclick = () => dismiss(t.id)
      }

      toastContainer.appendChild(toast)
    })

    // Cleanup
    return () => {
      if (toastContainer && toastContainer.childNodes.length === 0) {
        // Verificar si el contenedor es realmente un hijo de document.body antes de eliminarlo
        if (document.body.contains(toastContainer)) {
          document.body.removeChild(toastContainer)
        }
      }
    }
  }, [toasts])

  return { toast, dismiss }
}
