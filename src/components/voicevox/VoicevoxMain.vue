<script setup>
import { ref } from 'vue'
import { Characters } from '@/data/voicevox-characters'
import { useAudio } from '@/composables/useAudio'
import CharacterSelect from './CharacterSelect.vue'
import StyleSelect from './StyleSelect.vue'

// メインコンポーネント
/**
 * Selector de personaje y estilo de VoiceVox.
 * Props: ninguna.
 * Emits: set-character({ name: String, value: String (id del estilo), word?: String })
 */
const emit = defineEmits(['set-character'])

const character = ref(Characters[0])
const { playAudio } = useAudio()

function setStyle(style) {
  emit('set-character', {
    name: character.value.name,
    value: style.id.toString(),
    word: character.value.word,
  })
}

function handleCharacterChange(newCharacter) {
  if (newCharacter) {
    character.value = newCharacter
    setStyle(newCharacter.styles[0])
  }
}
</script>

<template>
  <div class="flex flex-col items-center w-full">
    <!-- キャラクター選択 -->
    <CharacterSelect :play-audio="playAudio" @set-character="handleCharacterChange" />
    <!-- スタイル選択 -->
    <StyleSelect :character="character" :play-audio="playAudio" @set-style="setStyle" />
  </div>
</template>
