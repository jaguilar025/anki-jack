<script setup>
// Menú principal (panel lateral): preferencias, datos, navegación y "Acerca de".
//  - emits: study-list-uploaded(categorías) al subir una lista de estudio
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Download,
  Home,
  Info,
  Menu,
  Trash2,
  Upload,
  FileUp,
  VolumeX,
  Loader2,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import ClearAudioCache from '@/components/ClearAudioCache.vue'
import AboutDialog from '@/components/AboutDialog.vue'
import { useTheme } from '@/composables/useTheme'
import { useDataActions } from '@/composables/useDataActions'
import { SUPPORTED_LOCALES, setLocale } from '@/i18n'

const emit = defineEmits(['study-list-uploaded'])

const { t, locale } = useI18n()
const { isDark, toggleDark } = useTheme()
const { exportProgress, importProgress, clearAllData, uploadStudyList, isUploading } = useDataActions()

const open = ref(false)
const showAudioCache = ref(false)
const showAbout = ref(false)

const dialogs = { audioCache: showAudioCache, about: showAbout }

/** Cierra el panel antes de abrir un diálogo (evita que compitan por el foco) */
async function openDialog(name) {
  open.value = false
  await nextTick()
  dialogs[name].value = true
}

async function onUpload() {
  const data = await uploadStudyList()
  if (data) {
    emit('study-list-uploaded', data)
    open.value = false
  }
}

function goHome() {
  window.location.replace('/')
}

const item =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50'
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button variant="outline" size="icon" :title="t('menu.open')">
        <Menu class="h-[1.2rem] w-[1.2rem]" />
        <span class="sr-only">{{ t('menu.open') }}</span>
      </Button>
    </SheetTrigger>

    <SheetContent side="left" class="w-80 gap-0 overflow-y-auto p-0">
      <SheetHeader class="border-b px-5 py-4">
        <SheetTitle>{{ t('menu.title') }}</SheetTitle>
        <SheetDescription class="sr-only">{{ t('menu.title') }}</SheetDescription>
      </SheetHeader>

      <div class="space-y-5 px-3 py-4">
        <!-- Preferencias -->
        <section class="space-y-1">
          <h3 class="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('menu.sections.preferences') }}
          </h3>
          <label class="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent">
            <span>{{ t('menu.theme') }} · {{ isDark ? t('menu.themeDark') : t('menu.themeLight') }}</span>
            <Switch :model-value="isDark" @update:model-value="toggleDark()" />
          </label>
          <div class="space-y-1.5 px-3 py-2">
            <span class="text-sm">{{ t('menu.language') }}</span>
            <div class="flex gap-1.5">
              <button
                v-for="l in SUPPORTED_LOCALES"
                :key="l.code"
                type="button"
                :class="[
                  'flex-1 rounded-md border px-2 py-1 text-xs transition-colors',
                  locale === l.code ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-accent',
                ]"
                @click="setLocale(l.code)"
              >
                {{ l.label }}
              </button>
            </div>
          </div>
        </section>

        <!-- Datos -->
        <section class="space-y-1">
          <h3 class="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('menu.sections.data') }}
          </h3>
          <button type="button" :class="item" :disabled="isUploading" @click="onUpload">
            <Loader2 v-if="isUploading" class="size-4 animate-spin" />
            <FileUp v-else class="size-4" />
            {{ t('dashboard.upload.label') }}
          </button>
          <button type="button" :class="item" @click="exportProgress">
            <Download class="size-4" /> {{ t('dashboard.data.export') }}
          </button>
          <button type="button" :class="item" @click="importProgress">
            <Upload class="size-4" /> {{ t('dashboard.data.import') }}
          </button>
          <button type="button" :class="item" @click="openDialog('audioCache')">
            <VolumeX class="size-4" /> {{ t('dashboard.audioCache.button') }}
          </button>
          <button type="button" :class="[item, 'text-destructive']" @click="clearAllData">
            <Trash2 class="size-4" /> {{ t('dashboard.data.clear') }}
          </button>
        </section>

        <!-- Navegación -->
        <section class="space-y-1">
          <h3 class="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {{ t('menu.sections.navigation') }}
          </h3>
          <button type="button" :class="item" @click="goHome">
            <Home class="size-4" /> {{ t('menu.home') }}
          </button>
        </section>

        <div class="border-t pt-3">
          <button type="button" :class="item" @click="openDialog('about')">
            <Info class="size-4" /> {{ t('menu.about') }}
          </button>
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <ClearAudioCache v-model:open="showAudioCache" :show-trigger="false" />
  <AboutDialog v-model:open="showAbout" />
</template>
