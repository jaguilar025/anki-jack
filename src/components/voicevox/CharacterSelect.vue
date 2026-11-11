<script setup>
import { ref } from 'vue'
import { Characters } from '@/data/voicevox-characters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Selector de personaje de VoiceVox.
 * Props: playAudio(text: String, speakerId: String) => Promise
 * Emits: set-character(character) — objeto de Characters seleccionado
 */
const props = defineProps({
  playAudio: { type: Function, required: true },
})

const emit = defineEmits(['set-character'])

const selected = ref(Characters[0].name)

async function handleValueChange(name) {
  selected.value = name
  const selectedCharacter = Characters.find((c) => c.name === name)
  if (selectedCharacter) {
    emit('set-character', selectedCharacter)
    await props.playAudio(
      selectedCharacter.word || `${selectedCharacter.name}です`,
      selectedCharacter.styles[0].id.toString()
    )
  }
}
</script>

<template>
  <div class="flex items-center justify-end mb-2 w-full max-w-[446px]">
    <Select :model-value="selected" @update:model-value="handleValueChange">
      <SelectTrigger>
        <SelectValue placeholder="Selecciona tu personaje" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="char in Characters" :key="char.speaker_uuid" :value="char.name">
          {{ char.name }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
