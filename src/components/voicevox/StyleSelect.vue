<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Selector de estilo de voz de un personaje de VoiceVox.
 * Props:
 *  - character: { name: String, word?: String, styles: [{ id: Number, name: String, type: String }] } | null
 *    (si no tiene estilos, no renderiza nada)
 *  - playAudio(text: String, styleId: String) => Promise
 * Emits: set-style(style) — objeto { id, name, type } del estilo seleccionado
 */
const props = defineProps({
  character: { type: Object, default: null },
  playAudio: { type: Function, required: true },
})

const { t } = useI18n()
const emit = defineEmits(['set-style'])

const value = ref(props.character?.styles?.[0]?.id.toString() ?? '')

// Solo resetear el valor si el personaje cambia y el valor actual no es válido
watch(
  () => props.character,
  (character) => {
    if (!character?.styles?.length) return
    const isValidValue = character.styles.some(
      (style) => style.id.toString() === value.value
    )
    if (!isValidValue) {
      value.value = character.styles[0].id.toString()
      emit('set-style', character.styles[0])
    }
  }
)

async function handleValueChange(newValue) {
  const selectedStyle = props.character.styles.find(
    (style) => style.id.toString() === newValue
  )
  if (selectedStyle) {
    value.value = newValue
    emit('set-style', selectedStyle)
    await props.playAudio(
      props.character.word || `${props.character.name}です`,
      newValue
    )
  }
}
</script>

<template>
  <div
    v-if="character?.styles?.length"
    class="flex items-center justify-end mb-2 w-full max-w-[446px]"
  >
    <Select :model-value="value" @update:model-value="handleValueChange">
      <SelectTrigger>
        <SelectValue :placeholder="t('dashboard.voicevox.selectStyle')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="style in character.styles"
          :key="style.id"
          :value="style.id.toString()"
        >
          {{ style.name }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
