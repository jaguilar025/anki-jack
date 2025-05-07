'use client'
import axios from 'axios'
import { useState } from 'react'
import { CharacterType, Style } from './types'
import { Characters, CharacterWords } from './config'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import CharacterSelect from './character-select'
import StyleSelect from './style-select';
import { CharacterStyleSelectProps } from "./types";
import { useSpeech } from "@/hooks/use-speech"

// メインコンポーネント
const Main = ({handlesetCharacter}: CharacterStyleSelectProps) => {
  const [character, setCharacter] = useState<CharacterType>(Characters[0])
  const { speak, isSpeaking } = useSpeech()

    // 音声再生
    const playAudio = async (text: string, speaker: string) => {
      console.log("star playing:" + text);
      try {
        // 音声取得
        console.log("await start");
        const responseAudio = await axios.post('/api/audio', {
          text,
          speaker,
        })
        console.log("await end wit data:", responseAudio);
    
        // Base64形式で取得
        const base64Audio = responseAudio?.data?.response
        // Bufferに変換
        const byteArray = Buffer.from(base64Audio, 'base64')
        // Blobに変換
        const audioBlob = new Blob([byteArray], { type: 'audio/x-wav' })
        // URLに変換
        const audioUrl = URL.createObjectURL(audioBlob)
        // 音声作成
        const audio = new Audio(audioUrl)
        // 音量[0-1]設定
        audio.volume = 1
        // 再生
        console.log("star playing");
        audio.play()
        console.log("end playing");
      } catch (e) {
        console.error(e)
        speak(text);
      }
    }

const setStyle = (style) => {

  const data = {
    name: character.name,
    value: style.id.toString(),
    word: character.word
  }
  handlesetCharacter(data)
}



  return (
    <div className="flex flex-col items-center w-full">
      {/* キャラクター選択 */}
      <CharacterSelect
        setCharacter={(newCharacter) => {
          if (newCharacter) { // Asegúrate de que newCharacter no sea null
            setCharacter(newCharacter);
            setStyle(newCharacter.styles[0] || null); // Ahora TypeScript sabe que newCharacter es CharacterType
            playAudio(
              newCharacter.word || CharacterWords[newCharacter.name],
              newCharacter.styles[0]?.id.toString() || '0' // Valor por defecto si no hay estilos
            );
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
  )
}

export default Main

//word: 'しこくめたんです',