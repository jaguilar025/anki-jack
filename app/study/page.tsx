"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StudyCard } from "@/components/study-card";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getAllCategories } from "@/lib/data";
import { motion } from "framer-motion";
import type { StudyConfig, StudyShowOption } from "@/lib/types";
import type { Word } from "@/lib/types";

//import Main from "@/components/voicevox/main";
import { CharacterStyleType } from "@/components/voicevox/types";
import { Characters } from "@/components/voicevox/config";
import { useAudio } from "@/hooks/use-audio";

import voices from "@/lib/voices.json";

const items = voices;

// Construye la configuración de práctica desde los parámetros de la URL.
// Admite el formato nuevo (show/answer) y hace fallback al antiguo `mode`.
function parseStudyConfig(
  showParam: string | null,
  answerParam: string | null,
  legacyMode: string | null
): StudyConfig {
  if (showParam !== null || answerParam !== null) {
    const valid: StudyShowOption[] = ["audio", "japanese", "english"];
    const show = (showParam?.split(",").filter((s) => valid.includes(s as StudyShowOption)) ??
      []) as StudyShowOption[];
    const answer = answerParam === "japanese" ? "japanese" : "english";
    return { show, answer };
  }

  switch (legacyMode) {
    case "0":
      return { show: ["audio"], answer: "japanese" };
    case "1":
      return { show: ["japanese", "audio"], answer: "japanese" };
    case "2":
      return { show: ["english"], answer: "japanese" };
    case "3":
      return { show: ["japanese", "audio"], answer: "english" };
    default:
      return { show: [], answer: "english" };
  }
}

function StudyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get("category");
  const showParam = searchParams.get("show");
  const answerParam = searchParams.get("answer");
  const legacyModeParam = searchParams.get("mode");

  const config = parseStudyConfig(showParam, answerParam, legacyModeParam);

  // Duración del temporizador por pregunta (segundos). Configurable vía ?time=.
  const timeParam = Number(searchParams.get("time"));
  const timerSeconds = Number.isFinite(timeParam) && timeParam > 0 ? timeParam : 45;
  const TIMER_MS = timerSeconds * 1000;
  const TICK_MS = 100;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [timeLeftMs, setTimeLeftMs] = useState(TIMER_MS);
  // Evita que el timeout se dispare más de una vez por pregunta.
  const timedOutRef = useRef(false);
  const [character, setCharacter] = useState<CharacterStyleType>({
    name: Characters[0].name,
    value: Characters[0].styles[0].id.toString(),
    word: Characters[0].word,
  });

  const { playAudio, stopAllAudio } = useAudio();


  useEffect(() => {
    const voiceID = Number(localStorage.getItem('voiceID')) || 1;
    const character = items.find(item => item.id_style_default === voiceID);
    if (!character) return;
    setCharacter({
      name: character.title,
      value: character.id_style_default.toString(),
      word: character.word
    });
  }, []);

  useEffect(() => {
    if (!categoryParam || config.show.length === 0) {
      stopAllAudio();
      router.push("/main");
      return;
    }

    // Obtener todas las categorías (predefinidas + personalizadas)
    const allCategories = getAllCategories();
    const categoryWords = allCategories[categoryParam];

    if (!categoryWords) {
      stopAllAudio();
      router.push("/main");
      return;
    }

    // Shuffle words
    const shuffled = [...categoryWords].sort(() => Math.random() - 0.5);
    setWords(shuffled);
  }, [categoryParam, config.show.length, router]);

  // Reinicia el temporizador y las banderas al cambiar de pregunta.
  useEffect(() => {
    setTimeLeftMs(TIMER_MS);
    timedOutRef.current = false;
  }, [currentIndex, TIMER_MS]);

  // El temporizador corre mientras la pregunta está activa (sin resolver).
  const timerActive =
    !gameOver &&
    words.length > 0 &&
    !(showResult && isCorrect) &&
    !revealed;

  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimeLeftMs((prev) => Math.max(0, prev - TICK_MS));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [timerActive, currentIndex, TICK_MS]);

  // Al agotarse el tiempo: se marca incorrecta y se avanza automáticamente.
  useEffect(() => {
    if (timeLeftMs > 0 || !timerActive || timedOutRef.current) return;
    timedOutRef.current = true;
    stopAllAudio();
    goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs, timerActive]);

  const handleAnswer = async (isAnswerCorrect: boolean) => {
    setIsCorrect(isAnswerCorrect);
    setShowResult(true);

    if (isAnswerCorrect) {
      setCorrectCount((prev) => prev + 1);
      const correct_messages = [
        "正解です！",
        "合っています！",
        "その通りです！",
        "まるです！",
        "よくできました！",
        "完璧です！",
      ];
      const correct_audio =
        correct_messages[Math.floor(Math.random() * correct_messages.length)];
      await playAudio(correct_audio, character?.value.toString());
    } else {
      const incorrect_messages = [
        "不正解です！",
        "違います！",
        "間違いです！",
        "残念、不正解です。",
        "それは間違っています！",
      ];
      const incorrect_audio =
        incorrect_messages[
          Math.floor(Math.random() * incorrect_messages.length)
        ];
      await playAudio(incorrect_audio, character?.value.toString());
    }
  };

  const handleSeeAnswer = () => {
    // Ver la respuesta cuenta como incorrecta (no suma al conteo de aciertos).
    setRevealed(true);
  };

  // Avanza a la siguiente pregunta (o termina). Las preguntas no acertadas
  // simplemente no incrementan el conteo de correctas.
  const goNext = () => {
    setShowResult(false);
    setIsCorrect(null);
    setRevealed(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameOver(true);
    }
  };

  const handleNext = () => goNext();

  // Saltar: marca la pregunta como incorrecta y pasa a la siguiente.
  const handleSkip = () => {
    stopAllAudio();
    goNext();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setGameOver(false);
    setShowResult(false);
    setIsCorrect(null);
    setRevealed(false);
    setTimeLeftMs(TIMER_MS);
    timedOutRef.current = false;

    // Shuffle words again
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
  };

  const handleBackToDashboard = () => {
    stopAllAudio();
    router.push("/main");
  };

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = (currentIndex / words.length) * 100;
  const total = words.length;
  const grade = total > 0 ? (correctCount / total) * 10 : 0;
  const timerFill = (1 - timeLeftMs / TIMER_MS) * 100;
  // La barra se pone en rojo en los últimos segundos.
  const timeRunningOut = timeLeftMs <= 5000;

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-background to-background/90">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={handleBackToDashboard}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <span className="text-sm text-muted-foreground">
          {Math.min(currentIndex + 1, total)} / {total}
        </span>
      </div>

      {/* Barra del temporizador por pregunta */}
      {!gameOver && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${
              timeRunningOut ? "bg-red-500" : "bg-primary"
            }`}
            style={{
              width: `${timerFill}%`,
              transition: `width ${TICK_MS}ms linear`,
            }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        {/*<Main handlesetCharacter={setCharacter} />*/}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {gameOver ? (
            <div className="text-center space-y-6 p-8 bg-card rounded-lg border border-border">
              <h2 className="text-xl font-bold">Juego Terminado</h2>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary">
                  {correctCount} / {total}
                </p>
                <p className="text-lg text-muted-foreground">
                  Calificación: {grade.toFixed(1)} / 10
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <Button onClick={handleRestart}>Reiniciar</Button>
                <Button variant="outline" onClick={handleBackToDashboard}>
                  Volver al inicio
                </Button>
              </div>
            </div>
          ) : (
            <StudyCard
              word={currentWord}
              config={config}
              onAnswer={handleAnswer}
              onSeeAnswer={handleSeeAnswer}
              onSkip={handleSkip}
              showResult={showResult}
              isCorrect={isCorrect}
              onNext={handleNext}
              character={character}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p>Cargando...</p>
        </div>
      }
    >
      <StudyContent />
    </Suspense>
  );
}
