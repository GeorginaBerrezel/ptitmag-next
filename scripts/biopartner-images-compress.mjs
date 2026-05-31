#!/usr/bin/env node
/**
 * Compresse les photos Biopartner brutes → WebP nommés par n° article.
 *
 * Usage :
 *   npm run biopartner:compress -- ~/Downloads/biopartner-photos-raw --scan
 *   npm run biopartner:compress -- ~/Downloads/biopartner-photos-raw
 *   npm run biopartner:compress -- ~/Downloads/biopartner-photos-raw ./biopartner-webp
 *
 * Parcourt les sous-dossiers (ex. tri par marque).
 * Le nom de fichier doit commencer par le n° article (ex. 12345.jpg).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const args = process.argv.slice(2)
const SCAN = args.includes('--scan')
const INPUT = args.find(a => !a.startsWith('--'))
const outputArg = args.filter(a => !a.startsWith('--'))[1]
const OUTPUT = outputArg ?? path.join(process.cwd(), 'biopartner-webp')
const MAX_WIDTH = 600
const WEBP_QUALITY = 78

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic', '.gif'])

/** N° article Biopartner en tête de nom : 300136113 ou 300136113_p_001.jpg */
function extractArticleRef(filename) {
  const base = path.basename(filename, path.extname(filename))
  const match = base.match(/^(\d+)(?:_|$)/)
  return match ? match[1] : null
}

async function collectImageFiles(dir, rootDir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue
      await collectImageFiles(fullPath, rootDir, acc)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!IMAGE_EXT.has(ext)) continue
    acc.push({
      fullPath,
      relPath: path.relative(rootDir, fullPath),
      name: entry.name,
      ref: extractArticleRef(entry.name),
      brandFolder: path.dirname(path.relative(rootDir, fullPath)).split(path.sep)[0] || '(racine)',
    })
  }
  return acc
}

async function runScan(inputDir) {
  console.log(`Scan de ${inputDir} (récursif)…`)
  const files = await collectImageFiles(inputDir, inputDir)
  const withRef = files.filter(f => f.ref)
  const withoutRef = files.filter(f => !f.ref)

  const brands = new Map()
  for (const f of files) {
    brands.set(f.brandFolder, (brands.get(f.brandFolder) ?? 0) + 1)
  }

  console.log('')
  console.log(`Images trouvées     : ${files.length}`)
  console.log(`Avec n° article     : ${withRef.length}`)
  console.log(`Sans n° (ignorées)  : ${withoutRef.length}`)
  console.log(`Dossiers / marques  : ${brands.size}`)
  console.log('')
  console.log('Top dossiers :')
  ;[...brands.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([name, count]) => console.log(`  ${count.toString().padStart(5)}  ${name}`))

  console.log('')
  console.log('Exemples avec n° article :')
  withRef.slice(0, 8).forEach(f => console.log(`  ${f.ref}  ←  ${f.relPath}`))

  if (withoutRef.length > 0) {
    console.log('')
    console.log('Exemples SANS n° article (à vérifier) :')
    withoutRef.slice(0, 8).forEach(f => console.log(`  ⚠ ${f.relPath}`))
  }

  const pct = files.length ? Math.round((withRef.length / files.length) * 100) : 0
  console.log('')
  if (pct >= 80) {
    console.log(`✓ ${pct}% des fichiers ont un n° article — tu peux lancer la compression sans --scan.`)
  } else if (pct >= 40) {
    console.log(`~ ${pct}% reconnus — une partie des photos ne matcheront pas le catalogue.`)
  } else {
    console.log(`✗ Seulement ${pct}% reconnus — envoie des exemples de noms à Georgina avant de tout compresser.`)
  }
}

async function runCompress(inputDir, outputDir) {
  await fs.mkdir(outputDir, { recursive: true })
  const files = await collectImageFiles(inputDir, inputDir)
  let converted = 0
  let skipped = 0
  const duplicates = new Map()

  for (const file of files) {
    if (!file.ref) {
      skipped++
      continue
    }

    const outPath = path.join(outputDir, `${file.ref}.webp`)

    if (duplicates.has(file.ref)) {
      console.warn(`⚠ Doublon n° ${file.ref} : ${file.relPath} (déjà ${duplicates.get(file.ref)})`)
    }
    duplicates.set(file.ref, file.relPath)

    await sharp(file.fullPath)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outPath)

    converted++
    if (converted % 200 === 0) console.log(`… ${converted} images`)
  }

  console.log('')
  console.log(`✓ ${converted} WebP → ${outputDir}`)
  console.log(`  ${skipped} fichier(s) ignoré(s) (pas de n° article)`)
  console.log('')
  console.log('Prochaine étape :')
  console.log(`  npm run biopartner:upload -- ${outputDir}`)
}

async function main() {
  if (!INPUT) {
    console.error('Usage: npm run biopartner:compress -- <dossier-source> [dossier-sortie] [--scan]')
    process.exit(1)
  }

  const inputDir = path.resolve(INPUT)
  try {
    await fs.access(inputDir)
  } catch {
    console.error(`Dossier introuvable : ${inputDir}`)
    process.exit(1)
  }

  if (SCAN) {
    await runScan(inputDir)
    return
  }

  await runCompress(inputDir, path.resolve(OUTPUT))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
