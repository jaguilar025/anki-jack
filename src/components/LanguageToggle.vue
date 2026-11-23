<script setup>
// Selector de idioma de la interfaz (español / inglés / japonés). Se recuerda entre sesiones.
import { Languages } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LOCALES, setLocale } from '@/i18n'

const { locale, t } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="icon" :title="t('common.language')">
        <Languages class="h-[1.2rem] w-[1.2rem]" />
        <span class="sr-only">{{ t('common.language') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuRadioGroup :model-value="locale" @update:model-value="setLocale">
        <DropdownMenuRadioItem v-for="l in SUPPORTED_LOCALES" :key="l.code" :value="l.code">
          {{ l.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
