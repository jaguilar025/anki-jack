"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSpeech } from "@/hooks/use-speech";
import axios from "axios";

let voiceVoxStatus = false;

export function useAudio() {
  //const [isVoiceVoxActive, setVoiceVoxStatus] = useState<boolean>(false);
  const [isVoiceVoxSpeaking, setVoiceVoxSpeaking] = useState<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Set<string>>(new Set());

  const { speak, isLocalSpeaking } = useSpeech();

  useEffect(() => {
    veryfyVoiceVoxStatus();
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

  const playAudio = useCallback(
    async (text: string, speaker: string) => {
      //console.log("isVoiceVoxActive", voiceVoxStatus);
      try {
        if (voiceVoxStatus) {
          //await axios.get("/api/version")
          await playVoiceVoxAudio(text, speaker);
        } else {
          speak(text);
        }
      } catch (e) {
        console.error("Error in playAudio:", e);
        speak(text);
      }
    },
    [voiceVoxStatus, playVoiceVoxAudio, speak]
  );

  return { playAudio, stopAllAudio, voiceVoxStatus, isSpeaking, veryfyVoiceVoxStatus };
}
