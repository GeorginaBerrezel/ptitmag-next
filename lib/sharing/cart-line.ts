import type { SupabaseClient } from '@supabase/supabase-js'

export type ShareOrderLookup =
  | { ok: true; quantity: number }
  | { ok: false; reason: 'not_ready' | 'already_ordered' }

/** Quantité réelle de la part (base), pas le minimum fournisseur du + Panier. */
export async function shareQuantityForOrder(
  supabase: SupabaseClient,
  memberId: string,
  productId: string,
): Promise<ShareOrderLookup> {
  const { data: pool, error: poolError } = await supabase
    .from('share_pools')
    .select('id')
    .eq('product_id', productId)
    .eq('status', 'ready')
    .maybeSingle()

  if (poolError || !pool) return { ok: false, reason: 'not_ready' }

  const { data: row, error: rowError } = await supabase
    .from('share_contributions')
    .select('quantity, ordered_at')
    .eq('pool_id', pool.id)
    .eq('member_id', memberId)
    .maybeSingle()

  if (rowError || !row) return { ok: false, reason: 'not_ready' }
  if (row.ordered_at) return { ok: false, reason: 'already_ordered' }

  const qty = Number(row.quantity)
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, reason: 'not_ready' }
  return { ok: true, quantity: qty }
}
