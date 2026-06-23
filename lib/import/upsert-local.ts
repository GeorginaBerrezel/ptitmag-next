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
  /** Produits retirés du fichier et masqués (active = false), jamais supprimés. */
  deactivated?: number
  error: string | null
}

export type CatalogProductInput = {
  supplierRef: string | null
  name: string
  description: string | null
  category: string | null
  unit: string
  unitPrice: number | null
  minQuantity: number
  allowsPartialOrder: boolean
}

export type CatalogUpsertOptions = {
  orderDeadline?: string | null
  /** Masque les produits absents du fichier au lieu de les supprimer (safe si commandes existantes). */
  deactivateMissing?: boolean
}

type RefResolvable = { name: string; supplierRef?: string | null }

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
  p: RefResolvable,
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
function dedupeCatalogRows<T extends RefResolvable>(parsed: T[]): { items: T[]; merged: number } {
  const byName = new Map<string, T>()
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
 * Upsert catalogue fournisseur par supplier_ref (explicite ou dérivé du nom).
 * Ne supprime jamais les produits — optionnellement les masque s'ils ne sont plus dans le fichier.
 */
export async function upsertSupplierCatalog(
  admin: SupabaseClient,
  supplierId: string,
  parsed: CatalogProductInput[],
  options: CatalogUpsertOptions = {},
): Promise<LocalUpsertResult> {
  const { orderDeadline = null, deactivateMissing = false } = options

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

  const { items: deduped, merged: duplicatesMerged } = dedupeCatalogRows(parsed)

  const toUpsert = deduped.map(p => {
    const ref = resolveSupplierRef(p, byRef, byName)
    return {
      name: p.name,
      description: p.description,
      category: p.category,
      unit: p.unit,
      unit_price: p.unitPrice,
      min_quantity: p.minQuantity,
      allows_partial_order: p.allowsPartialOrder,
      order_deadline: orderDeadline,
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

  let deactivated = 0
  if (deactivateMissing && toUpsert.length > 0) {
    const importedRefs = new Set(toUpsert.map(p => p.supplier_ref))
    const importedNames = new Set(deduped.map(p => normalizeSearch(p.name)))

    const { data: currentProducts, error: listErr } = await admin
      .from('products')
      .select('id, name, supplier_ref')
      .eq('supplier_id', supplierId)

    if (listErr) {
      return {
        count: totalUpserted,
        inserted,
        updated,
        duplicatesMerged,
        deactivated,
        error: `Produits importés, mais lecture du catalogue impossible : ${listErr.message}`,
      }
    }

    const toHide = (currentProducts ?? [])
      .filter(row => {
        const ref = row.supplier_ref as string | null
        const nameInImport = importedNames.has(normalizeSearch(row.name as string))
        if (ref) return !importedRefs.has(ref)
        return !nameInImport
      })
      .map(row => row.id as string)

    if (toHide.length > 0) {
      const { error: hideErr } = await admin
        .from('products')
        .update({ active: false })
        .in('id', toHide)

      if (hideErr) {
        return {
          count: totalUpserted,
          inserted,
          updated,
          duplicatesMerged,
          deactivated,
          error: `Produits importés, mais masquage des anciens produits impossible : ${hideErr.message}`,
        }
      }
      deactivated = toHide.length
    }
  }

  return { count: totalUpserted, inserted, updated, duplicatesMerged, deactivated, error: null }
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

  return upsertSupplierCatalog(
    admin,
    supplierId,
    parsed.map(p => ({
      supplierRef: p.supplierRef ?? null,
      name: p.name,
      description: null,
      category: p.category,
      unit: p.unit,
      unitPrice: p.unitPrice,
      minQuantity: localImportMinQuantity(config.supplierName, p.unit),
      allowsPartialOrder: false,
    })),
    { orderDeadline: null },
  )
}
