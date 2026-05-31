#!/usr/bin/env node
/**
 * Import photos Biopartner depuis le Swiss Transfer (zip de zips par marque).
 *
 * Structure attendue :
 *   swisstransfer.zip
 *     Allos.zip
 *       300136113_p_001.jpg
 *       300136113_y_001.jpg
 *
 * Usage :
 *   npm run biopartner:import -- ~/Downloads/swisstransfer_xxx.zip --scan
 *   npm run biopartner:import -- ~/Downloads/swisstransfer_xxx.zip
 *   npm run biopartner:import -- ~/Downloads/swisstransfer_xxx.zip ./biopartner-webp
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

const args = process.argv.slice(2)
const SCAN = args.includes('--scan')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  return i >= 0 ? Number.parseInt(args[i + 1], 10) : 0
})()
const filteredArgs = args.filter((a, i) => {
  if (a.startsWith('--')) return false
  if (i > 0 && args[i - 1] === '--limit') return false
  return true
})
const MAIN_ZIP = filteredArgs[0]
const OUTPUT = filteredArgs[1] ?? path.join(process.cwd(), 'biopartner-webp')

const MAX_WIDTH = 600
const WEBP_QUALITY = 78
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic', '.gif'])

/** N° article Biopartner en tête de nom : 300136113_p_001.jpg */
function extractArticleRef(filename) {
  const base = path.basename(filename, path.extname(filename))
  const match = base.match(/^(\d+)_/)
  return match ? match[1] : null
}

/** Préfère la photo packshot (_p_) à l'alternative (_y_). */
function photoPriority(filename) {
  if (/_p_\d+\./i.test(filename)) return 0
  if (/_y_\d+\./i.test(filename)) return 1
  return 2
}

async function listBrandZips(mainZip) {
  const { stdout } = await execFileAsync('unzip', ['-Z1', mainZip])
  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.toLowerCase().endsWith('.zip'))
}

async function extractBrandZip(mainZip, brandZipName, workDir) {
  await fs.mkdir(workDir, { recursive: true })
  const brandPath = path.join(workDir, path.basename(brandZipName))
  await execFileAsync('unzip', ['-o', '-j', mainZip, brandZipName, '-d', workDir])
  const imgDir = path.join(workDir, 'img')
  await fs.mkdir(imgDir, { recursive: true })
  await execFileAsync('unzip', ['-o', brandPath, '-d', imgDir])
  await fs.unlink(brandPath).catch(() => {})
  return imgDir
}

async function collectImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectImages(fullPath))
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!IMAGE_EXT.has(ext)) continue
    const ref = extractArticleRef(entry.name)
    if (!ref) continue
    files.push({ fullPath, name: entry.name, ref })
  }
  return files
}

function pickBestPerArticle(files) {
  const byRef = new Map()
  for (const file of files) {
    const prev = byRef.get(file.ref)
    if (!prev || photoPriority(file.name) < photoPriority(prev.name)) {
      byRef.set(file.ref, file)
    }
  }
  return [...byRef.values()]
}

async function runScan(mainZip) {
  const brands = await listBrandZips(mainZip)
  console.log(`Marques (fichiers .zip) : ${brands.length}`)
  console.log('')
  brands.slice(0, 15).forEach(b => console.log(`  · ${b}`))
  if (brands.length > 15) console.log(`  … et ${brands.length - 15} autres`)

  console.log('')
  console.log('Aperçu du contenu (1ère marque)…')
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bp-scan-'))
  try {
    const first = brands[0]
    const imgDir = await extractBrandZip(mainZip, first, workDir)
    const files = await collectImages(imgDir)
    const picked = pickBestPerArticle(files)
    console.log(`  ${first} → ${files.length} images, ${picked.length} articles`)
    picked.slice(0, 5).forEach(f => console.log(`    ${f.ref} ← ${f.name}`))
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }

  console.log('')
  console.log('Les n° article (ex. 300136113) correspondent à la colonne Article du CSV Biopartner.')
  console.log('Lance sans --scan pour compresser (plusieurs heures pour 25 Go).')
}

async function runImport(mainZip, outputDir) {
  await fs.mkdir(outputDir, { recursive: true })
  const brands = await listBrandZips(mainZip)
  const total = LIMIT > 0 ? Math.min(LIMIT, brands.length) : brands.length
  let converted = 0
  let brandsDone = 0

  console.log(`Import de ${total} marque(s) depuis ${path.basename(mainZip)}…`)
  console.log(`Sortie : ${outputDir}`)
  console.log('')

  for (let i = 0; i < total; i++) {
    const brandZip = brands[i]
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bp-import-'))
    try {
      const imgDir = await extractBrandZip(mainZip, brandZip, workDir)
      const picked = pickBestPerArticle(await collectImages(imgDir))

      for (const file of picked) {
        const outPath = path.join(outputDir, `${file.ref}.webp`)
        await sharp(file.fullPath)
          .rotate()
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toFile(outPath)
        converted++
      }

      brandsDone++
      console.log(`[${brandsDone}/${total}] ${brandZip} → ${picked.length} photo(s)`)
    } catch (err) {
      console.error(`✗ ${brandZip}: ${(err).message}`)
    } finally {
      await fs.rm(workDir, { recursive: true, force: true })
    }
  }

  console.log('')
  console.log(`✓ ${converted} WebP dans ${outputDir}`)
  console.log('')
  console.log('Prochaine étape :')
  console.log(`  npm run biopartner:upload -- ${outputDir}`)
}

async function main() {
  if (!MAIN_ZIP) {
    console.error('Usage: npm run biopartner:import -- <swisstransfer.zip> [sortie] [--scan] [--limit N]')
    process.exit(1)
  }

  const mainZip = path.resolve(MAIN_ZIP)
  try {
    await fs.access(mainZip)
  } catch {
    console.error(`Fichier introuvable : ${mainZip}`)
    process.exit(1)
  }

  if (SCAN) {
    await runScan(mainZip)
    return
  }

  await runImport(mainZip, path.resolve(OUTPUT))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
