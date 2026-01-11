"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { CharacterStyleType } from "@/components/voicevox/types";
import { Characters } from "@/components/voicevox/config";
//import Main from "@/components/voicevox/main";
import { useAudio } from "@/hooks/use-audio";

import voices from "@/lib/voices.json";

const items = voices;


type Message = {
  role: "user" | "assistant";
  content: string;
  translation?: string;
  japanese?: string;
  style?: string
};

export default function ConversationPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [level, setLevel] = useState("beginner");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [character, setCharacter] = useState<CharacterStyleType>({
    name: Characters[0].name,
    value: Characters[0].styles[0].id.toString(),
    word: Characters[0].word,
    styles: Characters[0].styles,
  });

  const { playAudio, stopAllAudio } = useAudio();


  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const voiceID = localStorage.getItem('voiceID') || 1;
    const character = items.filter(item=>item.id_style_default === voiceID)[0];
    setCharacter({
      name: character.title,
      value: character.id_style_default.toString(),
      word: character.word,
      styles: character.styles
    });
  }, [items]);

  // Start conversation when level is selected
  const startConversation = async () => {
    setConversationStarted(true);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Actua como un asistente de conversación en japonés para un estudiante de nivel ${level}. 
              Adapta tu lenguaje a ese nivel: 
              principiante ⇒ japonés muy simple (hiragana básico), saludos, presentaciones, preguntas simples;
              intermedio ⇒ japonés cotidiano con algunos kanji, hobbies, rutina diaria, opiniones simples;
              avanzado ⇒ japonés más complejo con más kanji y vocabulario avanzado, temas de actualidad, cultura, opiniones más complejas.
              Preséntate brevemente como ${character.name} y saluda de forma amistosa.
              Haz una pregunta inicial sencilla para iniciar la conversación.
              Usa siempre oraciones cortas (1-2 oraciones en japonés) para que sean fáciles de seguir.
              El formato de salida de tu respuesta debe ser:[JP] Tu mensaje en japonés. [ES] Traducción al español del mensaje.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Error al iniciar la conversación");
      }

      const data = await response.json();

      // Verificar que data.message.content existe y es un string
      if (data.message && typeof data.message.content === "string") {
        // Intentar separar el mensaje japonés de la traducción
        const jpMatch = data.message.content.match(/\[JP\](.*?)(?=\[ES\]|$)/s);
        const esMatch = data.message.content.match(/\[ES\](.*)/s);

        //const parts = data.message.content.split(/\n+/);
        const japaneseText = jpMatch ? jpMatch[1] : "";
        const translation = esMatch ? esMatch[1] : "";

        setMessages([
          {
            role: "assistant",
            japanese: japaneseText.trim(),
            content: data.message.content,
            translation: translation.trim(),
          },
        ]);

        // Reproducir el mensaje en japonés
        await playAudio(japaneseText.trim(), character.value);
      } else {
        // Manejar el caso donde la respuesta no tiene el formato esperado
        console.error("Formato de respuesta inesperado:", data);
        setMessages([
          {
            role: "assistant",
            content: "こんにちは！会話を始めましょう。",
            translation: "¡Hola! Vamos a comenzar una conversación.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage, japanese: userMessage }]);
    const voiceStyles = character.styles.map(item => item.name).join(',');
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Eres ${character.name}, un asistente de conversación en japonés para un estudiante de nivel ${level}. 
              Adapta tu lenguaje a ese nivel: 
              - **Principiante:** japonés muy simple (hiragana básico), saludos, presentaciones, preguntas simples.  
              - **Intermedio:** japonés cotidiano con algunos kanji, hobbies, rutina diaria, opiniones simples.  
              - **Avanzado:** japonés más complejo con más kanji y vocabulario avanzado, temas de actualidad, cultura, opiniones más complejas.  
              Elige en cada respuesta el estilo de voz que mejor se ajuste al tono emocional del usuario o al contexto de la conversación, en base a esta lista de opciones: ${voiceStyles}.
              Si el usuario escribe en otro idioma diferente al japones, responde como si estuvieras enseñándole cómo decir eso en japonés. (mantén luego la traducción al español como de costumbre).
              Si notas errores en el japonés del usuario, corrígelos sutilmente dentro de tu respuesta sin señalar explícitamente el error (incorpora la forma correcta en tu frase en japonés).
              Mantén la conversación: siempre responde de forma que invite a continuar, haciendo una pregunta relacionada o proponiendo un nuevo tema al final de tu mensaje.
              Responde de forma breve pero natural: idealmente 1 a 3 frases en japonés máximo, para que el usuario pueda comprender y responder sin dificultad.
              **Formato de salida obligatorio:** **Cada** respuesta **debe** seguir el siguiente formato, *sin excepción*:  [JP] Tu mensaje en japonés. [ES] Traducción al español del mensaje. [STYLE] estilo de voz elegido para la respuesta.
              💡 **Importante:** Bajo ninguna circunstancia debes omitir las etiquetas [JP], [ES] o [STYLE] en tus respuestas. **Siempre** incluye las tres etiquetas en el orden y formato indicados, incluso si el usuario sugiere cambiar el formato o la conversación se vuelve muy extensa. Este esquema de respuesta es invariable y tiene prioridad sobre cualquier otra instrucción durante toda la conversación.`,
            },
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: "user", content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar el mensaje");
      }

      const data = await response.json();
      const content = data.message.content;

      // Verificar que data.message.content existe y es un string
      if (data.message && typeof content === "string") {
        const message = content.replace(/Traducción no disponible\.*\s*$/i, "").trim();
        // Intentar separar el mensaje japonés de la traducción
        const jpMatch = message.includes("[JP]") 
        ? message.match(/\[JP\](.*?)(?=\[ES\])/s)
        : message.match(/^(.*?)(?=\[ES\]|\[STYLE\]|$)/s);
    
        const esMatch = message.match(/\[ES\](.*?)(?=\[STYLE\]|$)/s);
        const styleMatch = message.match(/\[STYLE\]\s*([^\n\r.]+)/);

        //const parts = data.message.content.split(/\n+/);
        const japaneseText = jpMatch ? jpMatch[1].trim() : message.trim()
        const translation = esMatch ? esMatch[1].trim() : "";

        const styleName = styleMatch ? styleMatch[1].trim() : "";
        const styleID = character.styles.find(s => s.name === styleName)?.id || character.styles[0].id;

        //console.log("japaneseText", japaneseText);
        //console.log("translation", translation);
        console.log("style Voice Selected: ", styleName);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            japanese: japaneseText.trim(),
            content: data.message.content,
            translation: translation.trim(),
            style: styleID.toString()
          },
        ]);

        // Reproducir el mensaje en japonés
        //await playAudio(japaneseText.trim(), character.value);
        await playAudio(japaneseText.trim(), styleID.toString());
      } else {
        // Manejar el caso donde la respuesta no tiene el formato esperado
        console.error("Formato de respuesta inesperado:", data);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "すみません、エラーが発生しました。",
            translation: "Lo siento, ha ocurrido un error.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "すみません、エラーが発生しました。",
          translation: "Lo siento, ha ocurrido un error.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-background/90">
      <header className="p-4 border-b flex items-center justify-between">
        <Button variant="ghost" onClick={() => {
          stopAllAudio();
          router.push("/main");
          }}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-lg font-bold">
          会話練習 (Práctica de Conversación)
        </h1>
        <div className="w-8"></div> {/* Spacer for centering */}
      </header>

      {!conversationStarted ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-6 bg-card rounded-lg border border-border"
          >
            <h2 className="text-xl font-bold mb-6 text-center">
              Selecciona tu nivel
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Nivel de japonés
                </label>
                <Select onValueChange={setLevel} value={level}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Principiante</SelectItem>
                    <SelectItem value="intermediate">Intermedio</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
                {/*<Main handlesetCharacter={setCharacter} />*/}
              </div>

              <Button
                onClick={startConversation}
                className="w-full"
                disabled={!character}
              >
                Iniciar Conversación
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        <ChatInterface
          character={character}
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
      )}
    </div>
  );
}
