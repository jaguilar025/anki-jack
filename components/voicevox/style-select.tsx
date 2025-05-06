// style-select.tsx
'use client';

import { StyleSelectProps } from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const StyleSelect = ({ character, setStyle, playAudio }: StyleSelectProps) => {
  if (!character || !character.styles || character.styles.length === 0) {
    return null; // No renderiza nada si no hay personaje o estilos
  }

  return (
    <div className="flex items-center justify-end mb-2 w-full max-w-[446px]">
      <Select
        defaultValue={character.styles[0].id.toString()}
        onValueChange={async (value) => {
          const selectedStyle = character.styles.find(
            (style) => style.id.toString() === value
          );
          if (selectedStyle) {
            setStyle(selectedStyle);
            await playAudio(
              character.word || `${character.name}です`,
              selectedStyle.id.toString()
            );
          }
        }}
      >
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