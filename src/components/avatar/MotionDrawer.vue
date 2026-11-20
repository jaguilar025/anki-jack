<script setup>
// Panel lateral (no modal) con los movimientos disponibles para el avatar cargado.
// Al hacer clic se reproducen y se ve al personaje haciéndolo.
//  - props: format ('vrm' | 'live2d'), modelMotions (Live2D: animaciones/expresiones del modelo)
//  - emits: play(item), close
//    item.kind: 'gesture' | 'emotion' | 'vrma' | 'motion' | 'expression'
import { computed, ref, useTemplateRef } from 'vue'
import { ExternalLink, Trash2, Upload, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { GESTURES, EMOTION_LABELS } from './motion/procedural'
import { useAvatarSettingsStore } from '@/stores/avatarSettings'

const props = defineProps({
  format: { type: String, default: 'vrm' },
  modelMotions: { type: Array, default: () => [] },
})
const emit = defineEmits(['play', 'close'])

const settings = useAvatarSettingsStore()
const fileInput = useTemplateRef('fileInput')
const lastPlayed = ref(null)

// Pack oficial gratuito de VRoid: 7 animaciones .vrma (3.29 MB, requiere cuenta de Booth)
const VROID_PACK_URL = 'https://booth.pm/ja/items/5512385'

const sections = computed(() => {
  const list = [
    {
      title: 'Gestos',
      items: Object.entries(GESTURES).map(([name, g]) => ({ id: `gesture:${name}`, label: g.label, kind: 'gesture', name })),
    },
    {
      title: 'Emociones',
      items: Object.entries(EMOTION_LABELS).map(([name, label]) => ({ id: `emotion:${name}`, label, kind: 'emotion', name })),
    },
  ]
  if (props.format === 'live2d') {
    const groups = Map.groupBy(props.modelMotions, (m) => m.group)
    for (const [title, items] of groups) list.push({ title, items })
  }
  return list
})

function play(item) {
  lastPlayed.value = item.id
  setTimeout(() => lastPlayed.value === item.id && (lastPlayed.value = null), 600)
  emit('play', item)
}

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const n = await settings.addAnimations(file)
    toast.success(n === 1 ? 'Animación agregada' : `${n} animaciones agregadas`)
  } catch (error) {
    console.error(error)
    toast.error(error.message || 'No se pudieron agregar las animaciones')
  }
}

const chip = (id) => [
  'rounded-full border px-3 py-1.5 text-xs transition hover:bg-foreground/10 active:scale-95',
  lastPlayed.value === id ? 'border-primary bg-primary/15' : 'border-foreground/15',
]
</script>

<template>
  <aside class="glass flex flex-col overflow-hidden rounded-3xl">
    <header class="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
      <h2 class="font-bold">
        Movimientos
        <span class="text-xs font-normal text-muted-foreground">· {{ format === 'vrm' ? 'VRM (3D)' : 'Live2D' }}</span>
      </h2>
      <button
        type="button"
        title="Cerrar"
        class="flex size-8 items-center justify-center rounded-full hover:bg-foreground/10"
        @click="emit('close')"
      >
        <X class="size-4" />
      </button>
    </header>

    <div class="flex-1 space-y-4 overflow-y-auto p-4">
      <section v-for="section in sections" :key="section.title" class="space-y-2">
        <h3 class="text-xs font-semibold text-muted-foreground">{{ section.title }}</h3>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="item in section.items" :key="item.id" type="button" :class="chip(item.id)" @click="play(item)">
            {{ item.label }}
          </button>
        </div>
      </section>

      <!-- VRM: animaciones .vrma -->
      <section v-if="format === 'vrm'" class="space-y-2">
        <h3 class="text-xs font-semibold text-muted-foreground">Animaciones (.vrma)</h3>
        <div v-if="settings.customAnimations.length" class="flex flex-wrap gap-1.5">
          <span v-for="anim in settings.customAnimations" :key="anim.id" class="group relative">
            <button
              type="button"
              :class="chip(anim.id)"
              @click="play({ id: anim.id, label: anim.name, kind: 'vrma' })"
            >
              {{ anim.name }}
            </button>
            <button
              type="button"
              title="Quitar animación"
              class="absolute -right-1 -top-1 hidden rounded-full bg-background p-0.5 shadow group-hover:block hover:text-destructive"
              @click="settings.removeAnimation(anim.id)"
            >
              <Trash2 class="size-3" />
            </button>
          </span>
        </div>
        <p v-else class="text-xs text-muted-foreground">
          Aún no hay animaciones. El pack oficial de VRoid trae 7 gratis (3.3 MB).
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1.5 text-xs hover:bg-foreground/20"
            @click="fileInput?.click()"
          >
            <Upload class="size-3.5" /> Agregar .vrma o .zip
          </button>
          <a
            :href="VROID_PACK_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Pack de VRoid (Booth) <ExternalLink class="size-3" />
          </a>
        </div>
        <input ref="fileInput" type="file" accept=".vrma,.zip" class="hidden" @change="onFile" />
      </section>

      <p v-if="format === 'live2d' && !modelMotions.length" class="text-xs text-muted-foreground">
        Este modelo no trae animaciones ni expresiones propias.
      </p>
    </div>
  </aside>
</template>
