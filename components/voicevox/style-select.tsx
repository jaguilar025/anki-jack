"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { StyleSelectProps } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const StyleSelect = ({ character, setStyle, playAudio }: StyleSelectProps) => {
  if (!character?.styles?.length) {
    return null;
  }

  const defaultStyle = useMemo(() => character.styles[0], [character]);
  const [value, setValue] = useState(() => defaultStyle.id.toString());

  useEffect(() => {
    // Solo resetear el valor si el personaje cambia y el valor actual no es válido
    const newValue = defaultStyle.id.toString();
    const isValidValue = character.styles.some(
      (style) => style.id.toString() === value
    );
    if (!isValidValue) {
      setValue(newValue);
      setStyle(defaultStyle);
    }
  }, [character, defaultStyle, value, setStyle]);

  const handleValueChange = useCallback(
    async (newValue: string) => {
      const selectedStyle = character.styles.find(
        (style) => style.id.toString() === newValue
      );
      if (selectedStyle) {
        setValue(newValue);
        setStyle(selectedStyle);
        await playAudio(character.word || `${character.name}です`, newValue);
      }
    },
    [character, setStyle, playAudio]
  );

  return (
    <div className="flex items-center justify-end mb-2 w-full max-w-[446px]">
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un estilo de voz" />
        </SelectTrigger>
        <SelectContent>
          {character.styles.map((style) => (
            <SelectItem key={style.id} value={style.id.toString()}>
              {style.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StyleSelect;
