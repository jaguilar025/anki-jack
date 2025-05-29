import { Dispatch, SetStateAction } from 'react'

export interface Style {
    name: string;
    id: number;
    type: string;
  }

// キャラクターの型定義
export interface CharacterType {
    name: string;
    speaker_uuid: string;
    styles: Style[];
    version: string;
    supported_features: {
      permitted_synthesis_morphing: string;
    };
    word?: string; // Opcional, para mantener compatibilidad con la frase que se reproduce
  }


export interface CharacterStyleType {
    name: string;
    value: string;
    word?: string; // Opcional, para mantener compatibilidad con la frase que se reproduce
    styles: Style[];
  }


export type CharacterSelectProps = {
  setCharacter: Dispatch<SetStateAction<CharacterType>>
  playAudio: (text: string, speaker: string) => Promise<void>
}

export type CharacterStyleSelectProps = {
    handlesetCharacter: Dispatch<SetStateAction<CharacterType>>
  }

  
export interface StyleSelectProps {
    character: CharacterType | null;
    setStyle: (style: Style) => void;
    playAudio: (text: string, speaker: string) => Promise<void>;
  }