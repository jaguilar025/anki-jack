<script setup>
// Ajustes de la vista del avatar: modelo (VRM / Live2D) y fondo de la escena.
import { computed, ref, useTemplateRef } from 'vue'
import { Check, Download, ExternalLink, ImagePlus, Loader2, Trash2, Upload, UserRound, Video } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useI18n } from 'vue-i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import AmbienceSettings from './AmbienceSettings.vue'
import { Input } from '@/components/ui/input'
import { BACKGROUND_PRESETS, useAvatarSettingsStore } from '@/stores/avatarSettings'

const open = defineModel('open', { type: Boolean, default: false })

const { t } = useI18n()
const settings = useAvatarSettingsStore()
const fileInput = useTemplateRef('fileInput')
const avatarInput = useTemplateRef('avatarInput')

// --- Avatares ---
const format = ref(settings.selectedAvatar.format)
const FORMATS = [
  { id: 'vrm', label: 'VRM (3D)', accept: '.vrm' },
  { id: 'live2d', label: 'Live2D', accept: '.zip' },
]
const visibleAvatars = computed(() => settings.avatars.filter((a) => a.format === format.value))

/** Sitios para conseguir más modelos (label: texto literal, o labelKey: clave i18n; hintKey: clave i18n) */
const LINKS = {
  vrm: [
    { label: 'VRoid Hub', hintKey: 'avatar.settings.hint.vroidHub', url: 'https://hub.vroid.com/' },
    { label: 'VRoid Studio', hintKey: 'avatar.settings.hint.vroidStudio', url: 'https://vroid.com/studio' },
    { label: 'Booth · VRM', hintKey: 'avatar.settings.hint.boothMixed', url: 'https://booth.pm/ja/search/VRM' },
  ],
  live2d: [
    { label: 'nizima', hintKey: 'avatar.settings.hint.nizima', url: 'https://nizima.com/' },
    { label: 'Booth · Live2D', hintKey: 'avatar.settings.hint.boothMixed', url: 'https://booth.pm/ja/search/Live2D' },
    { labelKey: 'avatar.settings.link.samples', hintKey: 'avatar.settings.hint.samples', url: 'https://www.live2d.com/en/learn/sample/' },
  ],
}

// --- Video de YouTube como fondo ---
const youtubeUrl = ref('')

function applyYoutube() {
  if (settings.setYoutube(youtubeUrl.value)) youtubeUrl.value = ''
  else toast.error(t('avatar.settings.badYoutube'))
}

const formatSize = (bytes) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '')

async function onAvatarFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    await settings.addCustomAvatar(file)
    toast.success(t('avatar.settings.avatarAdded', { name: file.name }))
  } catch (error) {
    console.error(error)
    toast.error(error.message || t('avatar.settings.avatarSaveFailed'))
  }
}

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    await settings.setImage(file)
  } catch (error) {
    console.error(error)
    toast.error(t('avatar.settings.imageFailed'))
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('avatar.settings.title') }}</DialogTitle>
        <DialogDescription>{{ t('avatar.settings.description') }}</DialogDescription>
      </DialogHeader>

      <!-- Avatar -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">{{ t('avatar.settings.avatar') }}</h3>
          <div class="flex rounded-lg bg-muted p-0.5 text-xs">
            <button
              v-for="f in FORMATS"
              :key="f.id"
              type="button"
              :class="['rounded-md px-3 py-1 transition', format === f.id ? 'bg-background shadow' : 'text-muted-foreground']"
              @click="format = f.id"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div v-for="avatar in visibleAvatars" :key="avatar.id" class="group relative">
            <button
              type="button"
              :disabled="avatar.id in settings.downloads"
              :class="[
                'relative flex w-full flex-col overflow-hidden rounded-lg border-2 text-left transition',
                settings.selectedAvatarId === avatar.id ? 'border-primary' : 'border-transparent hover:border-foreground/20',
              ]"
              @click="settings.selectedAvatarId = avatar.id"
            >
              <span class="flex aspect-square w-full items-center justify-center bg-muted">
                <img v-if="avatar.preview" :src="avatar.preview" :alt="avatar.name" class="h-full w-full object-cover" />
                <UserRound v-else class="size-10 text-muted-foreground" />
              </span>
              <span class="truncate px-1.5 pt-1 text-xs font-medium">{{ avatar.name }}</span>
              <span class="flex items-center gap-1 px-1.5 pb-1.5 text-[11px] text-muted-foreground">
                <template v-if="avatar.id in settings.downloads">
                  <Loader2 class="size-3 animate-spin" />
                  {{ settings.downloads[avatar.id] >= 0 ? `${Math.round(settings.downloads[avatar.id] * 100)}%` : t('avatar.settings.downloading') }}
                </template>
                <template v-else-if="!settings.isAvailable(avatar)">
                  <Download class="size-3" /> {{ formatSize(avatar.size) }}
                </template>
                <template v-else>{{ avatar.custom ? t('avatar.settings.own', { size: formatSize(avatar.size) }) : t('avatar.settings.included') }}</template>
              </span>
              <!-- Barra de descarga -->
              <span
                v-if="avatar.id in settings.downloads"
                class="absolute inset-x-0 top-0 h-1 bg-primary transition-[width]"
                :style="{ width: `${Math.max(0, settings.downloads[avatar.id]) * 100}%` }"
              />
              <Check
                v-if="settings.selectedAvatarId === avatar.id"
                class="absolute right-1.5 top-1.5 size-5 rounded-full bg-primary p-0.5 text-primary-foreground"
              />
            </button>
            <button
              v-if="avatar.custom"
              type="button"
              :title="t('avatar.settings.removeAvatar')"
              class="absolute left-1.5 top-1.5 hidden rounded-full bg-background/80 p-1 hover:text-destructive group-hover:block"
              @click="settings.removeCustomAvatar(avatar.id)"
            >
              <Trash2 class="size-3.5" />
            </button>
          </div>

          <!-- Subir propio -->
          <button
            type="button"
            class="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
            @click="avatarInput?.click()"
          >
            <Upload class="size-6" />
            <span class="text-xs font-medium">{{ t('avatar.settings.upload') }}</span>
            <span class="text-[11px]">{{ format === 'vrm' ? '.vrm' : '.zip (Cubism 3/4)' }}</span>
          </button>
          <input
            ref="avatarInput"
            type="file"
            :accept="FORMATS.find((f) => f.id === format).accept"
            class="hidden"
            @change="onAvatarFile"
          />
        </div>

        <div class="space-y-1">
          <p class="text-xs text-muted-foreground">{{ t('avatar.settings.moreModels') }}</p>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="link in LINKS[format]"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              :title="t(link.hintKey)"
              class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition hover:bg-muted"
            >
              {{ link.labelKey ? t(link.labelKey) : link.label }} <ExternalLink class="size-3" />
            </a>
          </div>
        </div>
      </section>

      <!-- Ambiente (luces / filtro de color según el avatar cargado) -->
      <AmbienceSettings />

      <!-- Fondo -->
      <section class="space-y-3 border-t pt-4">
        <h3 class="text-sm font-semibold">{{ t('avatar.settings.background') }}</h3>

        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="preset in BACKGROUND_PRESETS"
            :key="preset.id"
            type="button"
            :title="t(preset.labelKey)"
            class="group flex flex-col items-center gap-1"
            @click="settings.background = preset.id"
          >
            <span
              :class="[
                'relative flex h-14 w-full items-center justify-center rounded-lg border-2 transition',
                settings.background === preset.id ? 'border-primary' : 'border-transparent group-hover:border-foreground/20',
              ]"
              :style="{ background: preset.css }"
            >
              <Check v-if="settings.background === preset.id" class="size-5 text-white drop-shadow" />
            </span>
            <span class="text-xs text-muted-foreground">{{ t(preset.labelKey) }}</span>
          </button>

          <!-- Color libre -->
          <label class="group flex cursor-pointer flex-col items-center gap-1" :title="t('avatar.settings.color')">
            <span
              :class="[
                'relative flex h-14 w-full items-center justify-center rounded-lg border-2 transition',
                settings.background === 'color' ? 'border-primary' : 'border-transparent group-hover:border-foreground/20',
              ]"
              :style="{ background: settings.color }"
            >
              <Check v-if="settings.background === 'color'" class="size-5 text-white drop-shadow" />
              <input
                v-model="settings.color"
                type="color"
                class="absolute inset-0 cursor-pointer opacity-0"
                @input="settings.background = 'color'"
                @click="settings.background = 'color'"
              />
            </span>
            <span class="text-xs text-muted-foreground">{{ t('avatar.settings.color') }}</span>
          </label>
        </div>

        <!-- Video de YouTube -->
        <div class="space-y-2 rounded-lg border p-3">
          <div class="flex items-center gap-3">
            <button
              v-if="settings.youtubeId"
              type="button"
              :class="[
                'relative h-14 w-20 shrink-0 rounded-md border-2 bg-cover bg-center',
                settings.background === 'youtube' ? 'border-primary' : 'border-transparent',
              ]"
              :style="{ backgroundImage: `url(https://i.ytimg.com/vi/${settings.youtubeId}/mqdefault.jpg)` }"
              :title="t('avatar.settings.useVideo')"
              @click="settings.background = 'youtube'"
            >
              <Video class="absolute bottom-1 right-1 size-4 text-white drop-shadow" />
            </button>
            <p class="flex-1 text-sm text-muted-foreground">
              {{ t('avatar.settings.youtubeBg') }}
              <span class="block text-xs">{{ t('avatar.settings.youtubeNote') }}</span>
            </p>
            <Button
              v-if="settings.youtubeId"
              size="icon"
              variant="ghost"
              :title="t('avatar.settings.removeVideo')"
              @click="settings.removeYoutube()"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
          <form class="flex gap-2" @submit.prevent="applyYoutube">
            <Input v-model="youtubeUrl" placeholder="https://www.youtube.com/watch?v=…" class="h-8 flex-1 text-sm" />
            <Button size="sm" type="submit" :disabled="!youtubeUrl.trim()">{{ t('avatar.settings.use') }}</Button>
          </form>
        </div>

        <!-- Imagen propia -->
        <div class="flex items-center gap-3 rounded-lg border p-3">
          <button
            v-if="settings.image"
            type="button"
            :class="[
              'relative h-14 w-20 shrink-0 rounded-md border-2 bg-cover bg-center',
              settings.background === 'image' ? 'border-primary' : 'border-transparent',
            ]"
            :style="{ backgroundImage: `url(${settings.image})` }"
            :title="t('avatar.settings.useImage')"
            @click="settings.background = 'image'"
          />
          <div class="flex-1 text-sm text-muted-foreground">
            {{ settings.image ? t('avatar.settings.yourImage') : t('avatar.settings.imagePrompt') }}
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
          <Button size="sm" variant="outline" @click="fileInput?.click()">
            <ImagePlus class="mr-1 size-4" />
            {{ settings.image ? t('avatar.settings.change') : t('avatar.settings.uploadImage') }}
          </Button>
          <Button
            v-if="settings.image"
            size="icon"
            variant="ghost"
            :title="t('avatar.settings.removeImage')"
            @click="settings.removeImage()"
          >
            <Trash2 class="size-4" />
          </Button>
        </div>
      </section>
    </DialogContent>
  </Dialog>
</template>
