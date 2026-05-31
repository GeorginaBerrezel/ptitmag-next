#!/usr/bin/env node
/**
 * Upload les WebP Biopartner vers Supabase Storage (bucket product-images).
 *
 * Prérequis : .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage :
 *   npm run biopartner:upload -- ./biopartner-webp
 *   npm run biopartner:upload -- ./biopartner-webp --dry-run
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const PRODUCT_IMAGES_BUCKET = 'product-images'

function buildStoragePath(supplierRef) {
  return `biopartner/${supplierRef.trim()}.webp`
}

const INPUT = process.argv[2]
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH = 20

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function ensureBucket(admin) {
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = buckets?.some(b => b.name === PRODUCT_IMAGES_BUCKET)
  if (exists) return

  if (DRY_RUN) {
    console.log(`[dry-run] Créerait le bucket public "${PRODUCT_IMAGES_BUCKET}"`)
    return
  }

  const { error } = await admin.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 512000,
  })
  if (error) throw new Error(`Bucket : ${error.message}`)
  console.log(`✓ Bucket "${PRODUCT_IMAGES_BUCKET}" créé (public)`)
}

async function main() {
  if (!INPUT) {
    console.error('Usage: npm run biopartner:upload -- <dossier-webp> [--dry-run]')
    process.exit(1)
  }

  if (!url || !serviceKey) {
    console.error('Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local')
    process.exit(1)
  }

  const inputDir = path.resolve(INPUT)
  let entries
  try {
    entries = await fs.readdir(inputDir)
  } catch {
    console.error(`Dossier introuvable : ${inputDir}`)
    process.exit(1)
  }

  const files = entries.filter(f => f.endsWith('.webp'))
  if (files.length === 0) {
    console.error('Aucun fichier .webp dans ce dossier.')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  await ensureBucket(admin)

  console.log(`${DRY_RUN ? '[dry-run] ' : ''}Upload de ${files.length} images…`)

  let uploaded = 0
  let failed = 0

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH)
    await Promise.all(batch.map(async file => {
      const ref = path.basename(file, '.webp')
      const storagePath = buildStoragePath(ref)
      const filePath = path.join(inputDir, file)
      const body = await fs.readFile(filePath)

      if (DRY_RUN) {
        uploaded++
        return
      }

      const { error } = await admin.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(storagePath, body, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (error) {
        console.error(`✗ ${ref}: ${error.message}`)
        failed++
      } else {
        uploaded++
      }
    }))

    console.log(`… ${Math.min(i + BATCH, files.length)} / ${files.length}`)
  }

  console.log('')
  console.log(DRY_RUN
    ? `[dry-run] ${uploaded} fichiers prêts à uploader`
    : `✓ ${uploaded} uploadé(s)${failed ? ` · ${failed} erreur(s)` : ''}`)
  console.log('')
  console.log('Vérifie sur le site : catalogue Biopartner → les refs avec photo s\'affichent.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
