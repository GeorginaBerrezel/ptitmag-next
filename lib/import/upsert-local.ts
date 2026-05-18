import type { SupabaseClient } from '@supabase/supabase-js'
import type { LocalSupplierConfig, ParsedProduct } from './local-suppliers'

// Logique partagée : créer/récupérer le fournisseur, delete+insert les produits.
// Retourne le nombre de produits insérés ou un message d'erreur.

export async function upsertLocalSupplier(
  admin: SupabaseClient,
  config: LocalSupplierConfig,
  parsed: ParsedProduct[],
  deadline: string | null,
): Promise<{ count: number; error: string | null }> {
  // Créer ou récupérer le fournisseur
  let supplierId: string
  const { data: existing } = await admin
    .from('suppliers')
    .select('id')
    .eq('name', config.supplierName)
    .single()

  if (existing) {
    supplierId = existing.id
    // Réactiver le fournisseur s'il était inactif
    await admin.from('suppliers').update({ active: true }).eq('id', supplierId)
  } else {
    const { data: created, error: sErr } = await admin
      .from('suppliers')
      .insert({ name: config.supplierName, type: config.supplierType, active: true })
      .select('id')
      .single()
    if (sErr || !created) return { count: 0, error: `Impossible de créer le fournisseur : ${sErr?.message}` }
    supplierId = created.id
  }

  // Supprimer les anciens produits (stratégie hebdo : pas de supplier_ref)
  const { error: delErr } = await admin
    .from('products')
    .delete()
    .eq('supplier_id', supplierId)

  if (delErr) return { count: 0, error: `Impossible de supprimer les anciens produits : ${delErr.message}` }

  // Insérer les nouveaux produits par lots
  const toInsert = parsed.map(p => ({
    name: p.name,
    description: null,
    category: p.category,
    unit: p.unit,
    unit_price: p.unitPrice,
    min_quantity: 1,
    allows_partial_order: false,
    order_deadline: deadline,
    supplier_id: supplierId,
    supplier_ref: null,
    active: true,
    is_featured: false,
  }))

  const BATCH = 200
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const { error: insErr } = await admin.from('products').insert(toInsert.slice(i, i + BATCH))
    if (insErr) return { count: inserted, error: `Lot ${Math.floor(i / BATCH) + 1} : ${insErr.message}` }
    inserted += toInsert.slice(i, i + BATCH).length
  }

  return { count: inserted, error: null }
}
