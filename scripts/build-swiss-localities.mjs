/**
 * Télécharge les NPA suisses (données Geonames via williambelle/switzerland-postal-codes)
 * et produit lib/localities/swiss-localities.json — format plat pour recherche client.
 *
 * Source : https://github.com/williambelle/switzerland-postal-codes (CC BY 3.0 Geonames)
 * Usage : node scripts/build-swiss-localities.mjs
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_URL =
  'https://raw.githubusercontent.com/williambelle/switzerland-postal-codes/master/dist/postal-codes-full.json'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'lib/localities/swiss-localities.json')

const res = await fetch(SOURCE_URL)
if (!res.ok) {
  console.error('Échec téléchargement:', res.status, res.statusText)
  process.exit(1)
}

/** @type {Record<string, Array<{ name: string; canton: string }>>} */
const raw = await res.json()

/** @type {Array<{ postalCode: string; name: string; canton: string }>} */
const entries = []

for (const [postalCode, localities] of Object.entries(raw)) {
  for (const loc of localities) {
    entries.push({
      postalCode,
      name: loc.name,
      canton: loc.canton,
    })
  }
}

entries.sort((a, b) => {
  const zip = a.postalCode.localeCompare(b.postalCode, 'fr', { numeric: true })
  if (zip !== 0) return zip
  return a.name.localeCompare(b.name, 'fr')
})

writeFileSync(outPath, JSON.stringify(entries))

console.log(`✓ ${entries.length} localités → ${outPath}`)
