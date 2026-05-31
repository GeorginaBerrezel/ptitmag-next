#!/usr/bin/env node
/**
 * Compresse les photos Biopartner brutes → WebP nommés par n° article.
 *
 * Usage :
 *   node scripts/biopartner-images-compress.mjs ~/Downloads/biopartner-photos-raw
 *   node scripts/biopartner-images-compress.mjs ~/Downloads/biopartner-photos-raw ./biopartner-webp
 *
 * Le nom de fichier doit commencer par le n° article (ex. 12345.jpg, 12345_pommes.jpg).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const INPUT = process.argv[2]
const OUTPUT = process.argv[3] ?? path.join(process.cwd(), 'biopartner-webp')
const MAX_WIDTH = 600
const WEBP_QUALITY = 78

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic'])

function extractArticleRef(filename) {
  const base = path.basename(filename, path.extname(filename))
  const match = base.match(/^(\d+)/)
  return match ? match[1] : null
}

async function main() {
  if (!INPUT) {
    console.error('Usage: node scripts/biopartner-images-compress.mjs <dossier-source> [dossier-sortie]')
    process.exit(1)
  }

  const inputDir = path.resolve(INPUT)
  const outputDir = path.resolve(OUTPUT)

  let entries
  try {
    entries = await fs.readdir(inputDir, { withFileTypes: true })
  } catch {
    console.error(`Dossier introuvable : ${inputDir}`)
    process.exit(1)
  }

  await fs.mkdir(outputDir, { recursive: true })

  const files = entries.filter(e => e.isFile()).map(e => e.name)
  let converted = 0
  let skipped = 0
  const duplicates = new Map()

  for (const name of files) {
    const ext = path.extname(name).toLowerCase()
    if (!IMAGE_EXT.has(ext)) {
      skipped++
      continue
    }

    const ref = extractArticleRef(name)
    if (!ref) {
      console.warn(`⚠ Ignoré (pas de n° article au début) : ${name}`)
      skipped++
      continue
    }

    const outName = `${ref}.webp`
    const outPath = path.join(outputDir, outName)

    if (duplicates.has(ref)) {
      console.warn(`⚠ Doublon n° ${ref} : ${name} (déjà ${duplicates.get(ref)})`)
    }
    duplicates.set(ref, name)

    const inputPath = path.join(inputDir, name)
    await sharp(inputPath)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outPath)

    converted++
    if (converted % 100 === 0) console.log(`… ${converted} images`)
  }

  console.log('')
  console.log(`✓ ${converted} WebP → ${outputDir}`)
  console.log(`  ${skipped} fichier(s) ignoré(s)`)
  console.log('')
  console.log('Prochaine étape :')
  console.log(`  npm run biopartner:upload -- ${outputDir}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
