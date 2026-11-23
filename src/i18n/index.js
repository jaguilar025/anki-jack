// Internacionalización de la interfaz (vue-i18n): español, inglés y japonés.
//
// Textos: src/i18n/locales/<idioma>/<área>.json. Cada archivo es un "namespace" y su nombre es
// el prefijo de las claves: locales/es/study.json → t('study.card.skip').
// Los tres idiomas deben tener las mismas claves (español es el de respaldo).
//
// Uso:
//   - en plantillas: {{ $t('common.back') }}
//   - en <script setup>: const { t } = useI18n(); t('common.back')
//   - fuera de componentes (stores, lib): import { i18n } from '@/i18n'; i18n.global.t('…')
//   - interpolación: "Hola {name}" → t('ns.key', { name })
//   - OJO: en los textos, los caracteres @ | { } $ tienen significado especial en vue-i18n;
//     para mostrarlos literalmente usa {'@'} {'|'} {'{'} {'}'}.
//
// No se traduce el contenido de estudio (kanji, kana, vocabulario) ni los prompts de la IA.
import { createI18n } from 'vue-i18n'

export const SUPPORTED_LOCALES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
]
const STORAGE_KEY = 'app-locale'

// Carga todos los JSON: { es: { common: {...}, study: {...} }, en: {...}, ja: {...} }
const files = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' })
const messages = {}
for (const [path, content] of Object.entries(files)) {
  const [, lang, ns] = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
  ;(messages[lang] ??= {})[ns] = content
}

function initialLocale() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (SUPPORTED_LOCALES.some((l) => l.code === saved)) return saved
  const browser = navigator.language?.slice(0, 2)
  return SUPPORTED_LOCALES.some((l) => l.code === browser) ? browser : 'es'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'es',
  messages,
  // Las claves que falten avisan en consola solo en desarrollo
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
})

export function setLocale(code) {
  i18n.global.locale.value = code
  localStorage.setItem(STORAGE_KEY, code)
  document.documentElement.lang = code
}

document.documentElement.lang = i18n.global.locale.value
