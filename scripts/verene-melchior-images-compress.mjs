#!/usr/bin/env node
/**
 * Compresse les photos Vérène Melchior → AVIF dans public/images/products/verene-melchior/
 *
 * Les fichiers source doivent être nommés {imageId}.png|jpg|jpeg
 * (ex. enrobage-pistache.png, moelleux-citron.png).
 *
 * Usage :
 *   node scripts/verene-melchior-images-compress.mjs [dossier-source]
 *
 * Dossier par défaut : scripts/sources/verene-melchior/
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE = process.argv[2] ?? path.join(process.cwd(), 'scripts/sources/verene-melchior')
const OUTPUT = path.join(process.cwd(), 'public/images/products/verene-melchior')
const LOGO_OUTPUT = path.join(process.cwd(), 'public/images/producers/verene-melchior.jpg')
const MAX_WIDTH = 600
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i

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
    if (!IMAGE_EXT.test(entry)) continue
    const imageId = entry.replace(IMAGE_EXT, '')
    await compressOne(path.join(SOURCE, entry), imageId)
    count++
  }

  if (count === 0) {
    console.error(`Aucune photo reconnue dans ${SOURCE}`)
    process.exit(1)
  }

  const logoSource = path.join(SOURCE, 'truffes-assortiment.png')
  if (await fs.stat(logoSource).then(() => true).catch(() => false)) {
    await sharp(logoSource)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82 })
      .toFile(LOGO_OUTPUT)
    console.log('✓ logo → public/images/producers/verene-melchior.jpg')
  }

  console.log(`\n${count} image(s) produit compressée(s).`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
