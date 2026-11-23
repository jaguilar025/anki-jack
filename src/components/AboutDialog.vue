<script setup>
// "Acerca de": descripción de la app y créditos/licencias de terceros (src/data/credits.js).
import { ExternalLink } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CREDITS } from '@/data/credits'

const open = defineModel('open', { type: Boolean, default: false })
const { t } = useI18n()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('menu.aboutTitle') }}</DialogTitle>
        <DialogDescription>{{ t('menu.aboutDesc') }}</DialogDescription>
      </DialogHeader>

      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-semibold">{{ t('menu.creditsTitle') }}</h3>
          <p class="text-xs text-muted-foreground">{{ t('menu.creditsNote') }}</p>
        </div>
        <ul class="divide-y rounded-lg border text-sm">
          <li v-for="c in CREDITS" :key="c.name" class="space-y-0.5 px-3 py-2">
            <a
              :href="c.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 font-medium hover:underline"
            >
              {{ c.name }} <ExternalLink class="size-3" />
            </a>
            <p class="text-xs text-muted-foreground">{{ t(c.useKey) }}</p>
            <p class="text-xs text-muted-foreground">© {{ c.author }} · {{ t('menu.license') }}: {{ c.license }}</p>
          </li>
          <li class="px-3 py-2 text-xs text-muted-foreground">{{ t('menu.uses.oss') }}</li>
        </ul>
      </section>
    </DialogContent>
  </Dialog>
</template>
