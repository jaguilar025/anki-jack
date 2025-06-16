// route.mjs
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import kanjiData from "../../../lib/kanji_n5.json" assert { type: "json" };

export async function POST(request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const { text: extractedKanji } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract only the Japanese kanji character from this image. Return only the kanji character, nothing else. If no kanji is found, return '空'. If there is more than one kanji or text, return the first kanji in the text, but always only one kanji.",
            },
            {
              type: "image",
              image: image,
            },
          ],
        },
      ],
      maxTokens: 10,
    });

    console.log("extractedKanji", extractedKanji);

    const trimmedKanji = extractedKanji?.trim();

    if (!trimmedKanji || trimmedKanji === "NOT_FOUND") {
      return NextResponse.json({ error: "No kanji found in image" }, { status: 404 });
    }

    // Find matching kanji
    const foundKanji = kanjiData.find((k) => k.kanji === trimmedKanji);

    if (!foundKanji) {
      return NextResponse.json({ error: "Kanji not found in database" }, { status: 404 });
    }

    return NextResponse.json({ kanji: foundKanji });
  } catch (error) {
    console.error("Error processing kanji:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}