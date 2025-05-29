"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { CharacterType } from "@/components/voicevox/types";
import { useAudio } from "@/hooks/use-audio";

type Message = {
  role: "user" | "assistant";
  content: string;
  translation?: string;
  japanese: string;
  style?: string;
};

interface MessageBubbleProps {
  message: Message;
  character: CharacterType;
}

export function MessageBubble({ message, character }: MessageBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(true);
  const { playAudio, isVoiceVoxActive, isSpeaking } = useAudio();

  const isAssistant = message.role === "assistant";

  const handleSpeak = async () => {
    await playAudio(message.japanese, message.style || character.value);
  };

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`rounded-lg p-3 max-w-[80%] ${
          isAssistant
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <p className="japanese-text text-sm md:text-base">
              {message.japanese}
            </p>

            {isAssistant && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={handleSpeak}
              >
                <Volume2
                  className={`h-3 w-3 ${
                    isSpeaking ? "text-primary animate-pulse" : ""
                  }`}
                />
              </Button>
            )}
          </div>

          {isAssistant && message.translation && showTranslation && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {message.translation}
            </p>
          )}

          {isAssistant && message.translation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs self-start -mt-1 h-6 px-2"
              onClick={() => setShowTranslation(!showTranslation)}
            >
              {showTranslation ? "Ocultar traducción" : "Mostrar traducción"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
