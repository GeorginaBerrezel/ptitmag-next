#!/usr/bin/env node
/**
 * Compresse les photos Graines d'Avenir → AVIF dans public/images/products/graines-avenir/
 *
 * Usage :
 *   node scripts/graines-avenir-images-compress.mjs [dossier-source]
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE = process.argv[2] ?? path.join(process.env.HOME ?? '', 'Desktop/PTITMAG/graines d\'avenir')
const OUTPUT = path.join(process.cwd(), 'public/images/products/graines-avenir')
const LOGO_OUTPUT = path.join(process.cwd(), 'public/images/producers/graines-avenir.jpg')
const MAX_WIDTH = 600

/** Fichier source → identifiant image catalogue */
const FILE_TO_ID = new Map([
  ['Amidonier.jpg', 'pain-amidonnier'],
  ['Brioche fruits.jpg', 'brioche-fruits'],
  ['Brioche nature.jpg', 'brioche-nature'],
  ['Brownies.jpg', 'brownies'],
  ['Craquants amandes choco.jpg', 'craquants-amandes-chocolat'],
  ['Craquants cannelle.jpg', 'craquants-cannelle'],
  ['Craquants choc orange.jpg', 'craquants-chocolat-orange'],
  ['Craquants gingembre.jpg', 'craquants-gingembre'],
  ['Craquants noisettes.jpg', 'craquants-noisettes'],
  ['Engrain.jpg', 'pain-engrain'],
  ['Épeautre graines.jpg', 'pain-epeautre-graines'],
  ['Épeautre graines.jpg', 'pain-epeautre-graines'],
  ['Épeautre.jpg', 'pain-epeautre'],
  ['Épeautre.jpg', 'pain-epeautre'],
  ['Gelée gingembre.jpg', 'gelee-gingembre'],
  ['Gelée gingembre.jpg', 'gelee-gingembre'],
  ['Kamut.jpg', 'pain-kamut'],
  ['Muffins ananas choc.jpg', 'muffins-ananas-chocolat'],
  ['Muffins bana choc.jpg', 'muffins-banane-chocolat'],
  ['Muffins gingembre.jpg', 'muffins-gingembre'],
  ['Noix.jpg', 'pain-noix'],
  ['Pain fruits.jpg', 'pain-fruits'],
  ['Sablé avoine choco.jpg', 'sable-avoine-chocolat'],
  ['Sablé avoine choco.jpg', 'sable-avoine-chocolat'],
])

function normalizeFilename(name) {
  return name.normalize('NFC')
}

async function compressOne(inputPath, imageId) {
  const outPath = path.join(OUTPUT, `${imageId}.avif`)
  await sharp(inputPath)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .avif({ quality: 72 })
    .toFile(outPath)
  const stat = await fs.stat(outPath)
  console.log(`✓ ${imageId}.avif (${Math.round(stat.size / 1024)} Ko)`)
}

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true })

  const entries = await fs.readdir(SOURCE)
  let count = 0

  for (const entry of entries) {
    const key = normalizeFilename(entry)
    const imageId = FILE_TO_ID.get(key)
    if (!imageId) continue
    await compressOne(path.join(SOURCE, entry), imageId)
    count++
  }

  if (count === 0) {
    console.error(`Aucune photo reconnue dans ${SOURCE}`)
    process.exit(1)
  }

  const logoSource = path.join(SOURCE, entries.find(e => normalizeFilename(e) === 'Engrain.jpg') ?? '')
  if (await fs.stat(logoSource).then(() => true).catch(() => false)) {
    await sharp(logoSource)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82 })
      .toFile(LOGO_OUTPUT)
    console.log(`✓ logo → public/images/producers/graines-avenir.jpg`)
  }

  console.log(`\n${count} image(s) produit compressée(s).`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
