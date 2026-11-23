<script setup>
// Panel lateral (no modal) con los movimientos disponibles para el avatar cargado.
// Al hacer clic se reproducen y se ve al personaje haciéndolo.
//  - props: format ('vrm' | 'live2d'), modelMotions (Live2D: animaciones/expresiones del modelo)
//  - emits: play(item), close
//    item.kind: 'gesture' | 'emotion' | 'vrma' | 'motion' | 'expression'
import { computed, ref, useTemplateRef } from 'vue'
import { ExternalLink, Trash2, Upload, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import { GESTURES, EMOTION_LABELS } from './motion/procedural'
import { useAvatarSettingsStore } from '@/stores/avatarSettings'
import { CHAT_COMMANDS } from '@/data/chatCommands'

const props = defineProps({
  format: { type: String, default: 'vrm' },
  modelMotions: { type: Array, default: () => [] },
})
const emit = defineEmits(['play', 'close'])

const { t } = useI18n()
const settings = useAvatarSettingsStore()

// Animaciones incluidas en la app (las de los comandos del chat compatibles con este avatar)
const builtinAnimations = computed(() =>
  CHAT_COMMANDS.filter((c) => c.action.type === 'animation' && c.formats.includes(props.format)),
)
const fileInput = useTemplateRef('fileInput')
const lastPlayed = ref(null)

// Pack oficial gratuito de VRoid: 7 animaciones .vrma (3.29 MB, requiere cuenta de Booth)
const VROID_PACK_URL = 'https://booth.pm/ja/items/5512385'

const sections = computed(() => {
  const list = [
    {
      title: t('avatar.motions.gestures'),
      items: Object.entries(GESTURES).map(([name, g]) => ({ id: `gesture:${name}`, label: t(g.labelKey), kind: 'gesture', name })),
    },
    {
      title: t('avatar.motions.emotions'),
      items: Object.entries(EMOTION_LABELS).map(([name, labelKey]) => ({ id: `emotion:${name}`, label: t(labelKey), kind: 'emotion', name })),
    },
  ]
  if (props.format === 'live2d') {
    const groups = Map.groupBy(props.modelMotions, (m) => m.group)
    for (const [title, items] of groups) list.push({ title: t(title), items })
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
    toast.success(n === 1 ? t('avatar.motions.added') : t('avatar.motions.addedMany', { count: n }))
  } catch (error) {
    console.error(error)
    toast.error(error.message || t('avatar.motions.addFailed'))
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
        {{ t('avatar.motions.title') }}
        <span class="text-xs font-normal text-muted-foreground">· {{ format === 'vrm' ? 'VRM (3D)' : 'Live2D' }}</span>
      </h2>
      <button
        type="button"
        :title="$t('common.close')"
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

      <!-- Animaciones incluidas (también se lanzan escribiendo su comando en el chat) -->
      <section v-if="builtinAnimations.length" class="space-y-2">
        <h3 class="text-xs font-semibold text-muted-foreground">{{ t('avatar.commands.builtin') }}</h3>
        <div v-for="cmd in builtinAnimations" :key="cmd.id" class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            :class="chip(cmd.id)"
            @click="play({ id: cmd.id, label: cmd.label, kind: 'builtin', url: cmd.action.url })"
          >
            {{ cmd.label }}
          </button>
          <span class="text-[11px] text-muted-foreground">{{ t('avatar.commands.typeHint', { phrase: cmd.phrases[0] }) }}</span>
        </div>
      </section>

      <!-- VRM: animaciones .vrma -->
      <section v-if="format === 'vrm'" class="space-y-2">
        <h3 class="text-xs font-semibold text-muted-foreground">{{ t('avatar.motions.animations') }}</h3>
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
              :title="t('avatar.motions.removeAnimation')"
              class="absolute -right-1 -top-1 hidden rounded-full bg-background p-0.5 shadow group-hover:block hover:text-destructive"
              @click="settings.removeAnimation(anim.id)"
            >
              <Trash2 class="size-3" />
            </button>
          </span>
        </div>
        <p v-else class="text-xs text-muted-foreground">
          {{ t('avatar.motions.none') }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1.5 text-xs hover:bg-foreground/20"
            @click="fileInput?.click()"
          >
            <Upload class="size-3.5" /> {{ t('avatar.motions.add') }}
          </button>
          <a
            :href="VROID_PACK_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {{ t('avatar.motions.pack') }} <ExternalLink class="size-3" />
          </a>
        </div>
        <input ref="fileInput" type="file" accept=".vrma,.zip" class="hidden" @change="onFile" />
      </section>

      <p v-if="format === 'live2d' && !modelMotions.length" class="text-xs text-muted-foreground">
        {{ t('avatar.motions.noModelMotions') }}
      </p>
    </div>
  </aside>
</template>
