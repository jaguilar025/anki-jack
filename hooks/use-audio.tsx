"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSpeech } from "@/hooks/use-speech";
import axios from "axios";

let voiceVoxStatus = false;
let elevanLabsStatus = false;

export function useAudio() {
  //const [isVoiceVoxActive, setVoiceVoxStatus] = useState<boolean>(false);
  const [isVoiceVoxSpeaking, setVoiceVoxSpeaking] = useState<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Set<string>>(new Set());

  const { speak, isLocalSpeaking } = useSpeech();

  useEffect(() => {
    //veryfyVoiceVoxStatus();
    veryfyElevenLabsStatus();
    // Limpieza al desmontar el componente
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Limpiar URLs de objetos creados
    audioUrlsRef.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    audioUrlsRef.current.clear();
    
    setVoiceVoxSpeaking(false);
  }, []);

  const isSpeaking = useMemo(() => {
    return isVoiceVoxSpeaking || isLocalSpeaking;
  }, [isVoiceVoxSpeaking, isLocalSpeaking]);

  const veryfyVoiceVoxStatus = async () => {
    try {
      const { data: version } = await axios.get("/api/version");
      //console.log("version is true:", version === "latest")
      version === "latest" && (voiceVoxStatus = true);
      //setVoiceVoxStatus(version === "latest");
    } catch (e) {
      console.error(e);
      voiceVoxStatus = false;
      //setVoiceVoxStatus(false);
    }
  };

  const veryfyElevenLabsStatus = async () => {
    try {
      const { data } = await axios.get("/api/tts_version");
      console.log("status:", data.ok)
      data.ok && (elevanLabsStatus = true);
      //setVoiceVoxStatus(version === "latest");
    } catch (e) {
      console.error(e);
      elevanLabsStatus = false;
      //setVoiceVoxStatus(false);
    }
  }

  const playVoiceVoxAudio = useCallback(
    async (text: string, speaker: string) => {
    
      // Detener cualquier audio previo
    stopAllAudio();

    try {

      const responseAudio = await axios.post("/api/audio", {
        text,
        speaker,
      });
      // Base64形式で取得
      const base64Audio = responseAudio?.data?.response;
      // Bufferに変換
      const byteArray = Buffer.from(base64Audio, "base64");
      // Blobに変換
      const audioBlob = new Blob([byteArray], { type: "audio/x-wav" });
      // URLに変換
      const audioUrl = URL.createObjectURL(audioBlob);

      audioUrlsRef.current.add(audioUrl);


      // 音声作成
      const audio = new Audio(audioUrl);
      // 音量[0-1]設定
      audio.volume = 1;

      // Detectar cuando el audio comienza a reproducirse
      audio.onplay = () => setVoiceVoxSpeaking(true);

      // Detectar cuando el audio termina
      audio.onended = () => {
          setVoiceVoxSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioUrlsRef.current.delete(audioUrl);
          currentAudioRef.current = null;
        };

      // Manejar errores de reproducción
      audio.onerror = () => {
        setVoiceVoxSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioUrlsRef.current.delete(audioUrl);
          currentAudioRef.current = null;
          console.error("Error playing audio");
        };

      // 再生
      await audio.play();
      return audio;
    } catch (error) {
      console.error("Error in playVoiceVoxAudio:", error);
      throw error;
    }
    },
    [stopAllAudio]
  );

  const playElevenLabsAudio = useCallback(
  async (text: string, speaker?: string) => {
    // Detener cualquier audio previo
    stopAllAudio();
    console.log("{text, speaker}",{text, speaker})

    try {
      // Llamada a la nueva ruta TTS
      const responseAudio = await axios.post("/api/tts", {
        text,
        voice: speaker, // opcional, si no se pasa se usa la voz por defecto en el backend
      }, {
        responseType: 'arraybuffer', // <-- importante para recibir audio binario
      });
      console.log("responseAudio",responseAudio)

      const base64Audio = responseAudio?.data;
      if (!base64Audio) throw new Error("No audio received from ElevenLabs");

      // Convertir base64 a ArrayBuffer
      const byteArray = Buffer.from(base64Audio, "base64");

      // Crear Blob con tipo audio/mpeg
      const audioBlob = new Blob([byteArray], { type: "audio/mpeg" });

      // Crear URL temporal
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlsRef.current.add(audioUrl);

      // Crear objeto Audio
      const audio = new Audio(audioUrl);
      audio.volume = 1;

      // Detectar cuando comienza a reproducirse
      audio.onplay = () => setVoiceVoxSpeaking(true);

      // Detectar cuando termina
      audio.onended = () => {
        setVoiceVoxSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioUrlsRef.current.delete(audioUrl);
        currentAudioRef.current = null;
      };

      // Manejar errores de reproducción
      audio.onerror = () => {
        setVoiceVoxSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioUrlsRef.current.delete(audioUrl);
        currentAudioRef.current = null;
        console.error("Error playing ElevenLabs audio");
      };

      // Reproducir
      await audio.play();
      return audio;
    } catch (error) {
      console.error("Error in playElevenLabsAudio:", error);
      throw error;
    }
  },
  [stopAllAudio]
);

  const playAudio = useCallback(
    async (text: string, speaker: string) => {
      //console.log("isVoiceVoxActive", voiceVoxStatus);
      try {
        if (voiceVoxStatus || elevanLabsStatus) {
          await playVoiceVoxAudio(text, speaker);
          //await playElevenLabsAudio(text, speaker);
        } else {
          speak(text);
        }
      } catch (e) {
        console.error("Error in playAudio:", e);
        speak(text);
      }
    },
    [voiceVoxStatus, playVoiceVoxAudio, playElevenLabsAudio, speak]
  );

  return { playAudio, stopAllAudio, voiceVoxStatus, elevanLabsStatus, isSpeaking, veryfyVoiceVoxStatus, veryfyElevenLabsStatus };
}
