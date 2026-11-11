import { useDark, useToggle } from '@vueuse/core'

// Reemplaza next-themes (defaultTheme="dark"). Aplica/quita la clase .dark en <html>.
const isDark = useDark({ initialValue: 'dark' })
const toggleDark = useToggle(isDark)

export function useTheme() {
  return { isDark, toggleDark }
}
