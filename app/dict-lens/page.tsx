"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import KanjiInfo from "@/components/kanji-info"

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

export default function DictLens() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [kanjiResult, setKanjiResult] = useState<KanjiData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ["mobile", "android", "iphone", "ipad", "ipod", "blackberry", "windows phone"];
      const isMobileDevice = mobileKeywords.some((keyword) => userAgent.includes(keyword)) || window.innerWidth <= 768;
      console.log("Is mobile:", isMobileDevice, "User Agent:", userAgent, "Window width:", window.innerWidth);
      return isMobileDevice;
    };

    setIsMobile(checkMobile());
  }, []);

  useEffect(() => {
    if (isMobile) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isMobile]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
        setError("No se pudo reproducir el video de la cámara");
      });
    }
  }, [stream]);

  const checkCameraPermission = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "camera" });
      if (permissionStatus.state === "denied") {
        setError("El acceso a la cámara está denegado. Habilita los permisos en la configuración.");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error checking camera permission:", err);
      return true;
    }
  };

  const startCamera = async () => {
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) return;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Asegúrate de que los permisos estén habilitados.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("No se pudo capturar la imagen. La cámara no está lista.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setError("No se pudo obtener el contexto del lienzo.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (canvas.width === 0 || canvas.height === 0) {
      setError("La cámara no está lista para capturar la imagen.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageDataUrl);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    processImage(imageDataUrl);
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/process-kanji", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error procesando la imagen");
      }

      setKanjiResult(result.kanji);
    } catch (err) {
      console.error("Error processing image:", err);
      setError(err instanceof Error ? err.message : "Error procesando la imagen");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
    setKanjiResult(null);
    setError(null);
    if (isMobile) {
      startCamera();
    }
  };

  if (isMobile === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Camera className="mx-auto h-16 w-16" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Aplicación no soportada en PC</h2>
            <p className="text-gray-600 mb-6">
              Esta aplicación requiere una cámara móvil para funcionar correctamente. Por favor, accede desde un
              dispositivo móvil.
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (kanjiResult) {
    return <KanjiInfo kanjiResult={kanjiResult} onNewSearch={resetCamera}/>
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <Link href="/main">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Inicio
          </Button>
        </Link>
      </div>

      {stream && !capturedImage && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            style={{ display: stream && !capturedImage ? "block" : "none" }}
          />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              <div className="w-32 h-32 border-2 border-white/70 rounded-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-0.5 bg-white/70"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-0.5 h-8 bg-white/70"></div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="bg-white text-black hover:bg-gray-200 rounded-full w-16 h-16 p-0"
            >
              <Camera className="h-6 w-6" />
            </Button>
          </div>
        </>
      )}

      {capturedImage && (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <img src={capturedImage || "/placeholder.svg"} alt="Captured kanji" className="w-full rounded-lg mb-4" />

            {isProcessing && (
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Procesando imagen...</p>
              </div>
            )}

            {error && (
              <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={resetCamera} className="bg-white text-black">
                  Intentar de nuevo
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}