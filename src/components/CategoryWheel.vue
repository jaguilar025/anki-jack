<script setup>
// Contrato:
//  - props: options (string[], requerido)
//  - v-model: opción seleccionada (string)
import { ref, watch, nextTick } from 'vue'
import { Search } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'

const { t } = useI18n()
const props = defineProps({
  options: { type: Array, required: true },
})
const value = defineModel({ type: String, default: '' })

// Array indexado por posición en `options` (un ref="items" en v-for se ordena por montaje, no por índice)
const itemEls = []
const query = ref('')

const scrollIntoView = (index) => {
  itemEls[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

const handleSelect = (option, index) => {
  if (option !== value.value) value.value = option
  scrollIntoView(index)
}

// Busca la coincidencia más cercana: primero por prefijo, luego por
// inclusión, la selecciona y la trae a la vista.
const handleSearch = (raw) => {
  query.value = raw
  const q = String(raw).trim().toLowerCase()
  if (!q) return
  const lowered = props.options.map((o) => o.toLowerCase())
  let idx = lowered.findIndex((o) => o.startsWith(q))
  if (idx === -1) idx = lowered.findIndex((o) => o.includes(q))
  if (idx === -1) return
  handleSelect(props.options[idx], idx)
}

// Al fijar el valor desde fuera, trae la opción seleccionada a la vista.
watch(
  [value, () => props.options],
  async () => {
    await nextTick()
    const idx = value.value ? props.options.indexOf(value.value) : -1
    if (idx >= 0) scrollIntoView(idx)
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="relative">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        :model-value="query"
        :placeholder="t('dashboard.category.search')"
        class="pl-9"
        @update:model-value="handleSearch"
      />
    </div>

    <!-- Wrapper que ocupa el espacio restante. En desktop la lista va en
         absolute para no aportar altura y así la fila del grid la define la
         columna de ModeCards; en móvil usa una altura fija. -->
    <div class="relative h-64 min-h-0 md:h-auto md:flex-1">
      <div class="absolute inset-0 overflow-y-auto rounded-lg border border-border/50 bg-background/30 p-1">
        <div class="flex flex-col gap-1">
          <button
            v-for="(option, i) in options"
            :key="option"
            :ref="(el) => (itemEls[i] = el)"
            type="button"
            :class="`w-full rounded-md px-3 py-2 text-center text-base transition-colors ${
              option === value
                ? 'border-y-2 border-primary/60 bg-primary/5 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`"
            @click="handleSelect(option, i)"
          >
            <span class="block truncate">{{ option }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
