"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSpeech } from "@/hooks/use-speech";
import axios from "axios";

export function useAudio() {
  const [isVoiceVoxActive, setVoiceVoxStatus] = useState<boolean>(false);
  const [isVoiceVoxSpeaking, setVoiceVoxSpeaking] = useState<boolean>(false);

  const { speak, isLocalSpeaking } = useSpeech();

  useEffect(() => {
    veryfyVoiceVoxStatus();
  }, []);

  const isSpeaking = useMemo(() => {
    return isVoiceVoxSpeaking || isLocalSpeaking;
  }, [isVoiceVoxSpeaking, isLocalSpeaking]);

  const veryfyVoiceVoxStatus = async () => {
    try {
      const { data: version } = await axios.get("/api/version");
      setVoiceVoxStatus(version === "latest");
    } catch (e) {
      console.error(e);
      setVoiceVoxStatus(false);
    }
  };

  const playVoiceVoxAudio = useCallback(
    async (text: string, speaker: string) => {
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
      // 音声作成
      const audio = new Audio(audioUrl);
      // 音量[0-1]設定
      audio.volume = 1;

      // Detectar cuando el audio comienza a reproducirse
      audio.onplay = () => setVoiceVoxSpeaking(true);

      // Detectar cuando el audio termina
      audio.onended = () => {
        setVoiceVoxSpeaking(false);
        URL.revokeObjectURL(audioUrl); // Liberar recursos
      };

      // Manejar errores de reproducción
      audio.onerror = () => {
        setVoiceVoxSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        console.error("Error playing audio");
      };

      // 再生
      await audio.play();
      return audio;
    },
    []
  );

  const playAudio = useCallback(
    async (text: string, speaker: string) => {
      console.log("isVoiceVoxActive", isVoiceVoxActive);
      try {
        if (isVoiceVoxActive) {
          await playVoiceVoxAudio(text, speaker);
        } else {
          speak(text);
        }
      } catch (e) {
        console.error("Error in playAudio:", e);
      }
    },
    [isVoiceVoxActive, playVoiceVoxAudio, speak]
  );

  return { playAudio, isVoiceVoxActive, isSpeaking };
}
