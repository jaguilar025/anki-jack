"use client";

import { useCallback } from "react";
import { Characters } from "./config";
import { CharacterSelectProps } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CharacterSelect = ({ setCharacter, playAudio }: CharacterSelectProps) => {
  const handleValueChange = useCallback(
    async (value: string) => {
      const selectedCharacter = Characters.find((c) => c.name === value);
      if (selectedCharacter) {
        setCharacter(selectedCharacter);
        await playAudio(
          selectedCharacter.word || `${selectedCharacter.name}です`,
          selectedCharacter.styles[0].id.toString()
        );
      }
    },
    [setCharacter, playAudio]
  );

  return (
    <div className="flex items-center justify-end mb-2 w-full max-w-[446px]">
      <Select
        defaultValue={Characters[0].name}
        onValueChange={handleValueChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecciona tu personaje" />
        </SelectTrigger>
        <SelectContent>
          {Characters.map((char) => (
            <SelectItem key={char.speaker_uuid} value={char.name}>
              {char.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CharacterSelect;
