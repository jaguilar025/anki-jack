<script setup>
// Sección "Ambiente" de Ajustes. Los ambientes aplican a ambos tipos de avatar; el ajuste
// fino muestra luces 3D (VRM) o filtro de color (Live2D) según el avatar que se ve ahora.
import { computed, ref } from 'vue'
import { Check, ChevronDown, RotateCcw } from '@lucide/vue'
import { AMBIENCES } from '@/data/ambiences'
import { useAvatarSettingsStore } from '@/stores/avatarSettings'

const settings = useAvatarSettingsStore()
const showFine = ref(false)

const format = computed(() => settings.loadedFormat ?? settings.selectedAvatar.format)
const formatLabel = computed(() => (format.value === 'vrm' ? 'VRM (3D) · luces' : 'Live2D · filtro de color'))

const vrm = computed(() => settings.vrmLighting)
const l2d = computed(() => settings.live2dLook)

// Mover cualquier control convierte el ambiente en "Personalizado"
const touch = () => (settings.ambienceId = 'custom')

/** Controles del ajuste fino: [objeto, clave, etiqueta, min, max, step] */
const vrmSliders = [
  ['key', 'intensity', 'Intensidad', 0, 5, 0.1],
  ['key', 'azimuth', 'Dirección (← →)', -180, 180, 1],
  ['key', 'elevation', 'Altura', 0, 90, 1],
]
</script>

<template>
  <section class="space-y-3 border-t pt-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold">Ambiente</h3>
      <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{{ formatLabel }}</span>
    </div>

    <!-- Ambientes predefinidos -->
    <div class="grid grid-cols-6 gap-2">
      <button
        v-for="ambience in AMBIENCES"
        :key="ambience.id"
        type="button"
        :title="ambience.label"
        class="group flex flex-col items-center gap-1"
        @click="settings.applyAmbience(ambience.id)"
      >
        <span
          :class="[
            'flex size-10 items-center justify-center rounded-full border-2 transition',
            settings.ambienceId === ambience.id ? 'border-primary' : 'border-transparent group-hover:border-foreground/20',
          ]"
          :style="{ background: ambience.swatch }"
        >
          <Check v-if="settings.ambienceId === ambience.id" class="size-4 text-white drop-shadow" />
        </span>
        <span class="text-[11px] text-muted-foreground">{{ ambience.label }}</span>
      </button>
    </div>

    <!-- Ajuste fino -->
    <div class="rounded-lg border">
      <button
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-sm"
        @click="showFine = !showFine"
      >
        <span>
          Ajuste fino
          <span v-if="settings.ambienceId === 'custom'" class="text-xs text-muted-foreground">· personalizado</span>
        </span>
        <ChevronDown :class="['size-4 transition', showFine && 'rotate-180']" />
      </button>

      <div v-if="showFine" class="space-y-4 border-t px-3 py-3 text-xs">
        <!-- VRM: luces -->
        <template v-if="format === 'vrm'">
          <fieldset class="space-y-2">
            <legend class="mb-1 flex w-full items-center justify-between font-medium">
              Luz principal
              <input v-model="vrm.key.color" type="color" class="h-6 w-10 cursor-pointer rounded" @input="touch" />
            </legend>
            <label v-for="[obj, key, label, min, max, step] in vrmSliders" :key="key" class="flex items-center gap-2">
              <span class="w-28 shrink-0 text-muted-foreground">{{ label }}</span>
              <input
                v-model.number="vrm[obj][key]"
                type="range"
                :min="min"
                :max="max"
                :step="step"
                class="flex-1 accent-primary"
                @input="touch"
              />
              <span class="w-9 text-right tabular-nums">{{ vrm[obj][key] }}</span>
            </label>
          </fieldset>

          <fieldset class="space-y-2">
            <legend class="mb-1 font-medium">Luz de cielo y suelo</legend>
            <div class="flex items-center gap-2">
              <span class="w-28 shrink-0 text-muted-foreground">Cielo / suelo</span>
              <input v-model="vrm.sky" type="color" class="h-6 w-10 cursor-pointer rounded" @input="touch" />
              <input v-model="vrm.ground" type="color" class="h-6 w-10 cursor-pointer rounded" @input="touch" />
            </div>
            <label class="flex items-center gap-2">
              <span class="w-28 shrink-0 text-muted-foreground">Intensidad</span>
              <input v-model.number="vrm.hemi" type="range" min="0" max="2" step="0.05" class="flex-1 accent-primary" @input="touch" />
              <span class="w-9 text-right tabular-nums">{{ vrm.hemi }}</span>
            </label>
          </fieldset>

          <fieldset class="space-y-2">
            <legend class="mb-1 flex w-full items-center justify-between font-medium">
              Luz de contorno
              <input v-model="vrm.rim.color" type="color" class="h-6 w-10 cursor-pointer rounded" @input="touch" />
            </legend>
            <label class="flex items-center gap-2">
              <span class="w-28 shrink-0 text-muted-foreground">Intensidad</span>
              <input v-model.number="vrm.rim.intensity" type="range" min="0" max="4" step="0.1" class="flex-1 accent-primary" @input="touch" />
              <span class="w-9 text-right tabular-nums">{{ vrm.rim.intensity }}</span>
            </label>
          </fieldset>
        </template>

        <!-- Live2D: filtro de color -->
        <template v-else>
          <p class="text-muted-foreground">Live2D es 2D: no tiene luces, se ajusta el color del modelo.</p>
          <label class="flex items-center gap-2">
            <span class="w-28 shrink-0 text-muted-foreground">Brillo</span>
            <input v-model.number="l2d.brightness" type="range" min="0.4" max="1.5" step="0.01" class="flex-1 accent-primary" @input="touch" />
            <span class="w-9 text-right tabular-nums">{{ l2d.brightness }}</span>
          </label>
          <label class="flex items-center gap-2">
            <span class="w-28 shrink-0 text-muted-foreground">Saturación</span>
            <input v-model.number="l2d.saturation" type="range" min="-1" max="1" step="0.05" class="flex-1 accent-primary" @input="touch" />
            <span class="w-9 text-right tabular-nums">{{ l2d.saturation }}</span>
          </label>
          <div class="flex items-center gap-2">
            <span class="w-28 shrink-0 text-muted-foreground">Tinte</span>
            <input v-model="l2d.tint" type="color" class="h-6 w-10 shrink-0 cursor-pointer rounded" @input="touch" />
            <input v-model.number="l2d.tintAmount" type="range" min="0" max="1" step="0.05" class="flex-1 accent-primary" @input="touch" />
            <span class="w-9 text-right tabular-nums">{{ l2d.tintAmount }}</span>
          </div>
        </template>

        <button
          type="button"
          class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          @click="settings.resetAmbience()"
        >
          <RotateCcw class="size-3" /> Restablecer
        </button>
      </div>
    </div>
  </section>
</template>
