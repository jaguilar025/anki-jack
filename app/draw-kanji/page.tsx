"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, PenTool } from "lucide-react";
import Link from "next/link";
import DrawingCanvas from "@/components/drawing-canvas";
import KanjiInfo from "@/components/kanji-info";

interface KanjiData {
  code: string;
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
  url: string;
  gif: string;
  strokes: number;
  vocabulary: Array<{
    jp: string;
    pron: string;
    en: string;
  }>;
}

export default function DrawKanji() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [kanjiResult, setKanjiResult] = useState<KanjiData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);
    setCapturedImage(imageData);

    try {
      const response = await fetch("/api/process-kanji", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      });

      // Check if response is ok
      if (!response.ok) {
        // Try to parse error message
        let errorMessage = "Error procesando la imagen";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      const result = await response.json();

      if (!result.kanji) {
        throw new Error("No se recibió información del kanji");
      }

      setKanjiResult(result.kanji);
    } catch (err) {
      console.error("Error processing image:", err);
      let errorMessage = "Error procesando la imagen";

      if (err instanceof Error) {
        errorMessage = err.message;
      }

      // Handle specific error cases
      if (errorMessage.includes("API key")) {
        errorMessage = "Error de configuración: API key de OpenAI no válida";
      } else if (errorMessage.includes("quota")) {
        errorMessage = "Límite de API excedido. Intenta más tarde.";
      } else if (errorMessage.includes("not found")) {
        errorMessage = "No se pudo identificar el kanji en la imagen";
      } else if (errorMessage.includes("database")) {
        errorMessage = "Error en la base de datos de kanji";
      }

      // In development, show more details
      if (process.env.NODE_ENV === "development") {
        errorMessage += ` (Debug: ${
          err instanceof Error ? err.message : String(err)
        })`;
      }

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDrawing = () => {
    setCapturedImage(null);
    setKanjiResult(null);
    setError(null);
  };

  if (kanjiResult) {
    return <KanjiInfo kanjiResult={kanjiResult} onNewSearch={resetDrawing} />;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col justify-center items-center p-2">
      {/* Header */}
      <div className="top-4 z-10 w-full mb-8 p-0">
        <Link href="/main">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Inicio
          </Button>
        </Link>
      </div>

      {/* Main Content */}

      <Card className="h-[100vh] w-full flex flex-col">
        <CardHeader className="text-center pb-4 shrink-0">
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <PenTool className="h-5 w-5" />
            Dibuja un kanji en el lienzo
          </CardTitle>
        </CardHeader>

        {!capturedImage ? (
          <CardContent className="w-full flex-grow py-6">
            <DrawingCanvas
              onImageCapture={processImage}
              disabled={isProcessing}
            />
          </CardContent>
        ) : (
          <CardContent className="w-full flex-grow py-6">
            <div className="text-center mb-4">
              <img
                src={capturedImage || "/placeholder.svg"}
                alt="Kanji dibujado"
                className="w-full max-w-xs mx-auto rounded-lg border"
              />
            </div>

            {isProcessing && (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Procesando dibujo...</p>
              </div>
            )}

            {error && (
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button
                  onClick={resetDrawing}
                  variant="outline"
                  className="w-full"
                >
                  Intentar de nuevo
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
