"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2 } from "lucide-react";
import type { Word } from "@/lib/types";
import { CharacterType } from "@/components/voicevox/types";
import { useAudio } from "@/hooks/use-audio";

// Actualizar la interfaz de props para incluir onSeeAnswer
interface StudyCardProps {
  word: Word;
  mode: number;
  onAnswer: (isCorrect: boolean) => void;
  onSeeAnswer?: () => void;
  showResult: boolean;
  isCorrect: boolean | null;
  onNext: () => void;
  character: CharacterType;
}

export function StudyCard({
  word,
  mode,
  onAnswer,
  showResult,
  isCorrect,
  onNext,
  onSeeAnswer,
  character,
}: StudyCardProps) {
  const [answer, setAnswer] = useState("");
  const [showKana, setShowKana] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showResultInternal, setShowResultInternal] = useState(showResult);
  const { playAudio, isVoiceVoxActive, isSpeaking } = useAudio();

  useEffect(() => {
    // Focus input when card is shown
    if (inputRef.current && !showResult) {
      inputRef.current.focus();
    }

    // Reset answer when moving to next word
    if (!showResult) {
      setAnswer("");
    }

    // Auto-speak for audio mode
    if (mode === 0 && !showResult) {
      //handlePlayAudio()
    }
  }, [word, showResult, mode]);



  function validateAnswer(answer: String, correctWord: String) {
    // Normaliza ambas cadenas: elimina acentos/símbolos y convierte a minúsculas
    const normalize = (str: String) => {
      return str
        .normalize("NFD") // Separa caracteres y diacríticos (ej. "é" -> "e" + ´)
        .replace(/[\u0300-\u036f]/g, "") // Elimina diacríticos
        .toLowerCase()
        .trim();
    };
  
    const normalizedAnswer = normalize(answer);
    const normalizedCorrect = normalize(correctWord);
  
    // Valida que:
    // 1. El answer no esté vacío.
    // 2. Si el correctWord tiene más de 3 caracteres, el answer debe tener al menos 3.
    // 3. El normalizedCorrect incluya normalizedAnswer.
    return (
      normalizedAnswer !== "" &&
      (normalizedCorrect.length <= 3 || normalizedAnswer.length >= 3) &&
      normalizedCorrect.includes(normalizedAnswer)
    );
  }

  // Modificar la función handleSubmit para que no reinicie el estado cuando la respuesta es incorrecta
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (showResult && showAnswer) {
      onNext();
      return;
    }

    if (showResult && !showAnswer && isCorrect) {
      onNext();
      return;
    }

    let isAnswerCorrect = false;

    switch (mode) {
      case 0: // Audio + Writing
      case 1: // Visual + Audio
        isAnswerCorrect =
          answer.trim().toLowerCase() === word.japanese_advance.toLowerCase() ||
          answer.trim().toLowerCase() === word.japanese_basic.toLowerCase();
        break;
      case 2: // Translation
        isAnswerCorrect =
          answer.trim().toLowerCase() === word.japanese_advance.toLowerCase() ||
          answer.trim().toLowerCase() === word.japanese_basic.toLowerCase();
        break;
      case 3: // Translation inverted
        isAnswerCorrect = validateAnswer(answer, word.spanish ?? word.english)
        break;
    }

    onAnswer(isAnswerCorrect);
  };

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Si estamos en la etapa del "Siguiente", que llame a onNext
      if (showResult && (isCorrect || showAnswer)) {
        onNext();
      } else {
        // Si aún no se mostró el resultado, comprobar la respuesta
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [showResult, isCorrect, showAnswer, handleSubmit, onNext]);

  // Modificar la función handleShowAnswer para llamar a onSeeAnswer
  const handleShowAnswer = () => {
    setShowAnswer(true);
    if (onSeeAnswer) {
      onSeeAnswer();
    }
  };

  const handlePlayAudio = async () => {
    await playAudio(word.japanese_basic, character.value);
  };

  const renderContent = () => {
    switch (mode) {
      case 0: // Audio + Writing
        return (
          <div className="flex flex-col items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={handlePlayAudio}
            >
              <Volume2
                className={`h-8 w-8 ${
                  isSpeaking ? "text-primary animate-pulse" : ""
                }`}
              />
            </Button>
            <p className="text-sm text-muted-foreground">
              Escucha y escribe la palabra en japonés
            </p>
          </div>
        );

      case 1: // Visual + Audio
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Switch
                id="show-kana"
                checked={showKana}
                onCheckedChange={setShowKana}
              />
              <Label htmlFor="show-kana">Mostrar kana</Label>
            </div>

            <div className="text-center">
              <h3 className="japanese-text text-[40px] font-normal mb-2">
                {showKana ? word.japanese_basic : word.japanese_advance}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePlayAudio}
                className="mt-2"
              >
                <Volume2
                  className={`h-4 w-4 mr-1 ${
                    isSpeaking ? "text-primary animate-pulse" : ""
                  }`}
                />
                Escuchar
              </Button>
            </div>
          </div>
        );

      case 2: // Translation
        return (
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">{word.spanish ?? word.english}</h3>
            <p className="text-sm text-muted-foreground">
              Escribe la traducción en japonés
            </p>
          </div>
        );
      case 3: // Translation inverted
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Switch
              id="show-kana"
              checked={showKana}
              onCheckedChange={setShowKana}
            />
            <Label htmlFor="show-kana">Mostrar kana</Label>
          </div>

          <div className="text-center">
            <h3 className="japanese-text text-[40px] font-normal mb-2">
              {showKana ? word.japanese_basic : word.japanese_advance}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePlayAudio}
              className="mt-2"
            >
              <Volume2
                className={`h-4 w-4 mr-1 ${
                  isSpeaking ? "text-primary animate-pulse" : ""
                }`}
              />
              Escuchar
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          {renderContent()}

          {/* Cambiar la parte del input para que tenga un borde rojo cuando la respuesta es incorrecta
          y permanezca habilitado para escribir inmediatamente */}
          <div className="space-y-2">
            <Input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className={`text-center japanese-text ${
                showResult && !isCorrect && !showAnswer
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
              disabled={showResult && (isCorrect || showAnswer)}
            />
          </div>

          {/* Modificar la parte que muestra el resultado para eliminar el icono de tache */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-center space-y-2"
              >
                {isCorrect && <div className="text-2xl text-green-500">✓</div>}

                {(isCorrect || showAnswer) && (
                  <>
                    <div className="japanese-text font-bold">
                      {word.japanese_advance}
                      {word.japanese_advance !== word.japanese_basic && (
                        <span className="text-muted-foreground ml-2">
                          ({word.japanese_basic})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {word.spanish ?? word.english}
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Modificar la parte de los botones para eliminar el botón "Intentar de nuevo" */}
        <CardFooter className="flex justify-center p-6 pt-0">
          {showResult && !isCorrect && !showAnswer ? (
            <>
              <Button type="submit" className="flex-1">
                Comprobar
              </Button>
              <Button
                type="button"
                onClick={handleShowAnswer}
                variant="outline"
                className="flex-1"
              >
                Ver respuesta
              </Button>
            </>
          ) : (
            <Button type="submit" className="w-full">
              {showResult ? "Siguiente" : "Comprobar"}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
