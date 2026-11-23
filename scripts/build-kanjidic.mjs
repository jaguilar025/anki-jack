// Convierte KANJIDIC2 (versión JSON de jmdict-simplified) en un JSON compacto para la app.
//
// Uso:
//   1. Descarga "kanjidic2-en-<versión>.json.tgz" de
//      https://github.com/scriptin/jmdict-simplified/releases y descomprímelo.
//   2. node scripts/build-kanjidic.mjs <ruta/a/kanjidic2-en-x.y.z.json>
//
// Salida: server/data/kanjidic.json → { meta, kanji: { "日": { m, on, kun, nanori, s, g, j, f } } }
//   m: significados (inglés) · on/kun: lecturas · s: trazos · g: grado escolar
//   j: JLPT de la escala antigua (4 = el más fácil … 1) · f: frecuencia (1 = el más usado)
//
// Licencia de los datos: KANJIDIC2 © EDRDG, CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html)
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const input = process.argv[2]
if (!input) {
  console.error('Uso: node scripts/build-kanjidic.mjs <kanjidic2-en-x.y.z.json>')
  process.exit(1)
}

const src = JSON.parse(await readFile(input, 'utf8'))
const kanji = {}

for (const c of src.characters) {
  const groups = c.readingMeaning?.groups ?? []
  const readings = groups.flatMap((g) => g.readings)
  const entry = {
    m: groups.flatMap((g) => g.meanings).filter((m) => m.lang === 'en').map((m) => m.value),
    on: readings.filter((r) => r.type === 'ja_on').map((r) => r.value),
    kun: readings.filter((r) => r.type === 'ja_kun').map((r) => r.value),
    nanori: c.readingMeaning?.nanori ?? [],
    s: c.misc.strokeCounts?.[0] ?? null,
    g: c.misc.grade ?? null,
    j: c.misc.jlptLevel ?? null,
    f: c.misc.frequency ?? null,
  }
  // Quitar campos vacíos para reducir el tamaño
  for (const [k, v] of Object.entries(entry)) {
    if (v === null || (Array.isArray(v) && v.length === 0)) delete entry[k]
  }
  kanji[c.literal] = entry
}

const out = {
  meta: {
    source: 'KANJIDIC2 vía jmdict-simplified',
    version: src.version,
    dictDate: src.dictDate,
    license: 'CC BY-SA 4.0 — © Electronic Dictionary Research and Development Group (EDRDG)',
    count: Object.keys(kanji).length,
  },
  kanji,
}

const target = fileURLToPath(new URL('../server/data/kanjidic.json', import.meta.url))
await writeFile(target, JSON.stringify(out))
console.log(`OK: ${out.meta.count} kanji → ${target}`)
