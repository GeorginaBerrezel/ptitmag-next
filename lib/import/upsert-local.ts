import type { SupabaseClient } from '@supabase/supabase-js'
import { localImportMinQuantity } from '@/lib/catalog/bioterroir-quantity'
import type { LocalSupplierConfig, ParsedProduct } from './local-suppliers'
import { normalizeSearch } from '@/lib/catalog/search'

export type LocalUpsertResult = {
  count: number
  inserted: number
  updated: number
  /** Lignes en double dans le fichier (même référence) — la dernière est gardée. */
  duplicatesMerged: number
  error: string | null
}

/** Référence stable pour upsert local (contrainte supplier_id + supplier_ref). */
export function localProductRef(name: string): string {
  const base = normalizeSearch(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  return base || 'produit'
}

function refFromArticleId(articleId: string): string {
  return `id-${articleId}`
}

function resolveSupplierRef(
  p: ParsedProduct,
  byRef: Map<string, string>,
  byName: Map<string, string>,
): string {
  const norm = normalizeSearch(p.name)
  const existingId = byName.get(norm)
  if (existingId) {
    for (const [ref, id] of byRef) {
      if (id === existingId) return ref
    }
  }
  if (p.supplierRef) {
    const idRef = refFromArticleId(p.supplierRef)
    if (byRef.has(idRef)) return idRef
    return idRef
  }
  const slug = localProductRef(p.name)
  if (byRef.has(slug)) return slug
  return slug
}

/** Fusionne les lignes au même nom dans le fichier (garde la dernière, ou celle avec n° article). */
function dedupeParsed(parsed: ParsedProduct[]): { items: ParsedProduct[]; merged: number } {
  const byName = new Map<string, ParsedProduct>()
  let merged = 0
  for (const p of parsed) {
    const key = normalizeSearch(p.name)
    if (byName.has(key)) {
      merged++
      const prev = byName.get(key)!
      if (p.supplierRef && !prev.supplierRef) byName.set(key, p)
      else byName.set(key, p)
    } else {
      byName.set(key, p)
    }
  }
  return { items: [...byName.values()], merged }
}

/**
 * Import local : upsert par nom (via supplier_ref), sans effacer le catalogue.
 * Produits absents du fichier restent en base — Joel les masque manuellement si besoin.
 */
export async function upsertLocalSupplier(
  admin: SupabaseClient,
  config: LocalSupplierConfig,
  parsed: ParsedProduct[],
  _deadline: string | null,
): Promise<LocalUpsertResult> {
  let supplierId: string
  const { data: existing } = await admin
    .from('suppliers')
    .select('id')
    .eq('name', config.supplierName)
    .single()

  if (existing) {
    supplierId = existing.id
    await admin.from('suppliers').update({ active: true }).eq('id', supplierId)
  } else {
    const { data: created, error: sErr } = await admin
      .from('suppliers')
      .insert({ name: config.supplierName, type: config.supplierType, active: true })
      .select('id')
      .single()
    if (sErr || !created) {
      return { count: 0, inserted: 0, updated: 0, duplicatesMerged: 0, error: `Impossible de créer le fournisseur : ${sErr?.message}` }
    }
    supplierId = created.id
  }

  const { data: existingProducts, error: fetchErr } = await admin
    .from('products')
    .select('id, name, supplier_ref')
    .eq('supplier_id', supplierId)

  if (fetchErr) {
    return { count: 0, inserted: 0, updated: 0, duplicatesMerged: 0, error: fetchErr.message }
  }

  const byRef = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const row of existingProducts ?? []) {
    if (row.supplier_ref) byRef.set(row.supplier_ref as string, row.id as string)
    byName.set(normalizeSearch(row.name as string), row.id as string)
  }

  // Rattacher les anciennes lignes sans supplier_ref (premier import après Phase 5)
  for (const row of existingProducts ?? []) {
    if (row.supplier_ref) continue
    const ref = localProductRef(row.name as string)
    if (byRef.has(ref)) continue
    const { error: linkErr } = await admin
      .from('products')
      .update({ supplier_ref: ref })
      .eq('id', row.id)
    if (!linkErr) {
      byRef.set(ref, row.id as string)
      byName.set(normalizeSearch(row.name as string), row.id as string)
    }
  }

  const { items: deduped, merged: duplicatesMerged } = dedupeParsed(parsed)

  const toUpsert = deduped.map(p => {
    const ref = resolveSupplierRef(p, byRef, byName)
    return {
      name: p.name,
      description: null,
      category: p.category,
      unit: p.unit,
      unit_price: p.unitPrice,
      min_quantity: localImportMinQuantity(config.supplierName, p.unit),
      allows_partial_order: false,
      order_deadline: null,
      supplier_id: supplierId,
      supplier_ref: ref,
      active: true,
      is_featured: false,
    }
  })

  let inserted = 0
  let updated = 0
  for (const p of deduped) {
    const ref = resolveSupplierRef(p, byRef, byName)
    const norm = normalizeSearch(p.name)
    if (byRef.has(ref) || byName.has(norm)) updated++
    else inserted++
  }

  const BATCH = 200
  let totalUpserted = 0
  for (let i = 0; i < toUpsert.length; i += BATCH) {
    const batch = toUpsert.slice(i, i + BATCH)
    const { error: upsertErr } = await admin
      .from('products')
      .upsert(batch, { onConflict: 'supplier_id,supplier_ref', ignoreDuplicates: false })

    if (upsertErr) {
      return {
        count: totalUpserted,
        inserted,
        updated,
        duplicatesMerged,
        error: `Lot ${Math.floor(i / BATCH) + 1} : ${upsertErr.message}`,
      }
    }
    totalUpserted += batch.length
  }

  return { count: totalUpserted, inserted, updated, duplicatesMerged, error: null }
}
