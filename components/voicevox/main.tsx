"use client";

import { useState } from "react";
import { CharacterType, Style } from "./types";
import { Characters, CharacterWords } from "./config";
import CharacterSelect from "./character-select";
import StyleSelect from "./style-select";
import { CharacterStyleSelectProps } from "./types";
import { useAudio } from "@/hooks/use-audio";


// メインコンポーネント
const Main = ({ handlesetCharacter }: CharacterStyleSelectProps) => {
  const [character, setCharacter] = useState<CharacterType>(Characters[0]);
  const { playAudio, isVoiceVoxActive } = useAudio();

  const setStyle = (style) => {
    const data = {
      name: character.name,
      value: style.id.toString(),
      word: character.word,
    };
    handlesetCharacter(data);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* キャラクター選択 */}
      <CharacterSelect
        setCharacter={(newCharacter) => {
          console.log("newCharacter", newCharacter);
          if (newCharacter) {
            // Asegúrate de que newCharacter no sea null
            setCharacter(newCharacter);
            setStyle(newCharacter.styles[0] || null); // Ahora TypeScript sabe que newCharacter es CharacterType
          }
        }}
        playAudio={playAudio}
      />
      {/* スタイル選択 */}
      <StyleSelect
        character={character}
        setStyle={setStyle}
        playAudio={playAudio}
      />
    </div>
  );
};

export default Main;

//word: 'しこくめたんです',
