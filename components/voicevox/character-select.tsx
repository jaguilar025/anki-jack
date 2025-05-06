"use client";

import { Characters } from "./config";
import { CharacterSelectProps } from "./types";
//import Select from 'react-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// キャラクター選択
const CharacterSelect = ({ setCharacter, playAudio }: CharacterSelectProps) => {
  return (
    <div className="flex items-center justify-end mb-2 w-full max-w-[446px]">
      <Select
      defaultValue={Characters[0].name}
        onValueChange={async (value) => {
          const selectedData = Characters.find((c) => c.name === value);
          if (selectedData) {
            setCharacter(selectedData);
            await playAudio(
              selectedData.word || `${selectedData.name}です`,
              selectedData.styles[0].id.toString()
            );
          }
        }}
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
