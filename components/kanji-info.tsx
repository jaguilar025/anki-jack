"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

interface KanjiResultProps {
  kanjiResult: KanjiData;
  onNewSearch: () => void;
  backUrl?: string;
}

export default function KanjiInfo({
  kanjiResult,
  onNewSearch,
}: KanjiResultProps) {
  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/main">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Inicio
            </Button>
          </Link>
          <Button className="bg-gray-300" onClick={onNewSearch} size="sm">
            Nueva Captura
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 bg-black rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <Image
                src={kanjiResult.gif || "/placeholder.svg"}
                alt={`Orden de trazos para ${kanjiResult.kanji}`}
                width={200}
                height={200}
                className="rounded-lg invert"
              />
              <div className="text-gray-400">
                Strokes: {kanjiResult.strokes}
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-8">
              <div className="flex flex-row gap-2">
                <p className="text-gray-500">Meaning:</p>
                <p className="text-gray-600">{kanjiResult.meaning}</p>
              </div>
              <div className="flex flex-row gap-2">
                <p className="text-gray-500">Onyomi:</p>
                <p className="text-gray-600">{kanjiResult.onyomi}</p>
              </div>
              <div className="flex flex-row gap-2">
                <p className="text-gray-500">Kunyomi:</p>
                <p className="text-gray-600">{kanjiResult.kunyomi}</p>
              </div>

              <div className="my-6">
                <p className="text-gray-500 mb-2">Vocabulary:</p>
                <div className="space-y-2">
                  {kanjiResult.vocabulary.map((word, index) => (
                    <div
                      key={index}
                      className="bg-black border border-gray-500 p-3 rounded-lg"
                    >
                      <div className="font-medium">{word.jp}</div>
                      <div className="text-sm text-gray-600">{word.pron}</div>
                      <div className="text-sm text-gray-700">{word.en}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
