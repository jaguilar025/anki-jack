# Archivos descartados en la migración Next → Vue

Durante la migración de **anki-jack** (Next.js) a **repite** (Vue) estos archivos no se trasladaron porque ningún otro archivo los importaba. Los originales siguen en el repositorio de anki-jack: rama `feature/vue-migration`, último commit antes de migrar `d7e05ed`. Para recuperar uno:

```bash
cd ~/Documents/WEB/anki-jack && git show d7e05ed:<ruta>
```

| Archivo en Next | Líneas | Qué contenía | Posible uso a futuro |
|---|---|---|---|
| `lib/data_old.ts` | 3.040 | Versión anterior de `lib/data.ts`. Objeto `categories` (tipo `Category`) con vocabulario `{ japanese_advance, japanese_basic, spanish }` agrupado en categorías, más las funciones `saveCustomCategories`, `getCustomCategories`, `clearCustomCategories` y `getAllCategories` (localStorage, clave `nihongo-study-custom-categories`). | ⚠️ **Tiene datos que no están en `data.ts`**: las categorías **Marugoto 9 a 18**, **"Saludos y Expresiones Básicas"**, **"Verbos Comunes"** y **"Verbos/Acciones"**. En `data.ts`, Marugoto 1 a 8 existen pero están **comentadas** (bloque `/* ... */`, que se conserva en `src/data/categories.js`, líneas 2925 a 6553), así que la app no las muestra. Las categorías activas son las JLRC y las temáticas (Mes, Calendario, Contadores…). Conviene unir esas categorías con `src/data/categories.js` si se quieren volver a estudiar. |
| `lib/characters.ts` | 874 | Array `Characters: CharacterType[]` con los personajes de VOICEVOX (`name`, `speaker_uuid`, `styles[{ name, id, type }]`) y un mapa derivado `CharacterWords` (nombre → palabra). | Catálogo de voces de VOICEVOX. Su función la cubren hoy `lib/voices.json` y `components/voicevox/config.ts`. Sirve como referencia si se quiere mostrar los estilos de voz por personaje o actualizar la lista de speakers. |
| `lib/data_adj_i.ts` | 84 | Lista `I` de adjetivos い (`japanese_advance`, `japanese_basic`, `spanish`, `type: "い adj"`), un ejemplo de conjugación (`大きいです / 大きくないです / 大きかったです / 大きくなかったです`) y conectores (`そして, それから, でも`). No se exportaba nada. | Base para un **modo de práctica de conjugación de adjetivos い**, o para añadir una categoría "Adjetivos い" a `data.ts`. |
| `lib/data_adj_na.ts` | 81 | Lista `NA` de adjetivos な con la misma estructura (`type: "な adj"`) y un ejemplo de conjugación comentado (`好きです / 好きじゃないです / 好きでした / 好きじゃなかったです`). No se exportaba nada. | Igual que el anterior, para adjetivos な. |
| `lib/audioGlobal.ts` | 59 | Singleton `AudioGlobal` que garantiza **un solo audio sonando a la vez**: `play(src: string \| Blob)` detiene el audio anterior, crea un `Audio`, convierte el Blob en URL y devuelve una Promise; además `stop()`. | Útil si aparecen audios superpuestos (por ejemplo, al pulsar varias veces "escuchar"). En Vue se puede rehacer como composable o como store de Pinia. |
| `hooks/use-mobile.tsx` | 19 | Hook `useIsMobile()` que usa `matchMedia` con un breakpoint de 768px. | En Vue lo reemplaza `useMediaQuery('(max-width: 767px)')` de `@vueuse/core`, sin código propio. |
| `components/landingPage/personajes_completos.json` | 859 | Lista de personajes de VOICEVOX en **sintaxis de objeto JS, no JSON válido** (claves sin comillas). Es una copia de `characters.ts`. | Ninguno; está duplicado. |
| `components/landingPage/personajes_completos_final.json` | 481 | JSON válido con 34 personajes y datos para la landing: `id`, `image` (`/assets/characters/*.png`), `link` (`/main?char=...`), `title`, `description`, `speaker_uuid`, `styles`, `version`, `word`. | Fue la fuente de datos de `InfiniteMenu` antes de `lib/voices.json`. Útil si se quiere regenerar `voices.json` o volver a enlazar personajes con `/main?char=`. |
| `components/landingPage/items.jsx` | 31 | Demo de `InfiniteMenu` con imágenes de picsum.photos y enlaces a google.com. | Ninguno (código de ejemplo). |
| `components2.json` | 20 | Configuración antigua de shadcn/ui para React (`rsc`, `tsx`, `app/globals.css`). | Ninguno. La reemplaza `components.json` de shadcn-vue. |
| `components/ui/*` (sin usar) | — | Unos 40 componentes shadcn React que la app no importaba (accordion, calendar, carousel, chart, command, drawer, form, sidebar, etc.). | Si se necesita alguno: `npx shadcn-vue@latest add <componente>`. |
| `server.js` | 26 | Servidor HTTPS propio de Next en el puerto 3001 con los certificados mkcert. | Lo reemplaza `server.https` en `vite.config.js`. |
