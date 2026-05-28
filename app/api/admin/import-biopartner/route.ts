import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'
import {
  findBiopartnerCatalogByImportKey,
  LEGACY_BIOPARTNER_NAME,
} from '@/lib/import/biopartner-catalogs'
import { parseBiopartnerCsv, rowToProduct } from '@/lib/import/biopartner-csv'

async function getOrCreateSupplier(admin: ReturnType<typeof createAdminClient>, name: string) {
  const { data: existing } = await admin
    .from('suppliers')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (existing) return existing.id as string

  const { data: created, error } = await admin
    .from('suppliers')
    .insert({ name, type: 'grossiste_bio', active: true })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Impossible de créer le fournisseur ${name} : ${error?.message}`)
  }

  return created.id as string
}

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Accès réservé à l\'administrateur.' }, { status: 403 })
  }

  const supabaseAdmin = createAdminClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const catalogKey = (formData.get('catalog') as string | null)?.trim() || 'biopartner_general'

  const catalog = findBiopartnerCatalogByImportKey(catalogKey)
  if (!catalog) {
    return NextResponse.json({ error: 'Catalogue Biopartner invalide.' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })
  }

  const text = await file.text()

  let rows
  try {
    rows = parseBiopartnerCsv(text).rows
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Aucun produit trouvé dans le fichier.' }, { status: 400 })
  }

  let supplierId: string
  try {
    supplierId = await getOrCreateSupplier(supabaseAdmin, catalog.name)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const allProducts = rows.map(row => rowToProduct(row, supplierId))

  const { error: deactErr } = await supabaseAdmin
    .from('products')
    .update({ active: false })
    .eq('supplier_id', supplierId)

  if (deactErr) {
    return NextResponse.json(
      { error: `Impossible de désactiver l'ancien catalogue ${catalog.shortLabel} : ${deactErr.message}` },
      { status: 500 },
    )
  }

  const BATCH = 200
  const errors: string[] = []
  let totalUpserted = 0

  for (let i = 0; i < allProducts.length; i += BATCH) {
    const batch = allProducts.slice(i, i + BATCH)
    const { error: upsertErr } = await supabaseAdmin
      .from('products')
      .upsert(batch, {
        onConflict: 'supplier_id,supplier_ref',
        ignoreDuplicates: false,
      })

    if (upsertErr) {
      errors.push(`Lot ${Math.floor(i / BATCH) + 1} : ${upsertErr.message}`)
    } else {
      totalUpserted += batch.length
    }
  }

  return NextResponse.json({
    success: true,
    stats: {
      productsCreated: totalUpserted,
      productsUpdated: 0,
      errors: errors.length,
    },
    errors,
    catalog: catalog.name,
    message: `Import ${catalog.name} terminé : ${totalUpserted} produit(s) actifs. Les articles absents de ce CSV ont été retirés de ce catalogue.`,
  })
}

/** Désactive l'ancien fournisseur « Biopartner » unique (migration one-shot). */
export async function DELETE() {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Accès réservé à l\'administrateur.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: legacy } = await admin
    .from('suppliers')
    .select('id')
    .eq('name', LEGACY_BIOPARTNER_NAME)
    .maybeSingle()

  if (!legacy) {
    return NextResponse.json({ success: true, message: 'Ancien catalogue Biopartner déjà migré ou absent.' })
  }

  await admin.from('products').update({ active: false }).eq('supplier_id', legacy.id)
  await admin
    .from('suppliers')
    .update({ active: false, orders_open: false })
    .eq('id', legacy.id)

  return NextResponse.json({
    success: true,
    message: `Ancien fournisseur « ${LEGACY_BIOPARTNER_NAME} » masqué et ses produits désactivés.`,
  })
}
