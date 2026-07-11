"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getAllCategories } from "@/lib/data";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Word } from "@/lib/types";

function TableContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get("category");
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    if (!categoryParam) {
      router.push("/main");
      return;
    }

    const allCategories = getAllCategories();
    const categoryWords = allCategories[categoryParam];

    if (!categoryWords) {
      router.push("/main");
      return;
    }

    setWords(categoryWords);
  }, [categoryParam, router]);

  const handleBack = () => {
    router.push("/main");
  };

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-background to-background/90">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-3xl"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-primary text-center mb-6">
            {categoryParam}
          </h1>

          <div className="rounded-lg border border-border bg-card overflow-hidden text-[16px]">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Kana</TableHead>
                  <TableHead className="w-[30%]">Kanji</TableHead>
                  <TableHead className="w-[40%]">Traducción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {words.map((word, i) => (
                  <TableRow key={`${word.japanese_basic}-${i}`}>
                    <TableCell className="japanese-text break-words text-[16px]">
                      {word.japanese_basic}
                    </TableCell>
                    <TableCell className="japanese-text break-words text-[16px]">
                      {word.japanese_advance}
                    </TableCell>
                    <TableCell className="break-words text-[16px]">
                      {word.spanish ?? word.english}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function TablePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p>Cargando...</p>
        </div>
      }
    >
      <TableContent />
    </Suspense>
  );
}
