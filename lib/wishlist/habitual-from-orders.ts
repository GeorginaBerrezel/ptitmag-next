import type { SupabaseClient } from '@supabase/supabase-js'

/** Commandes prises en compte pour les suggestions « habituels ». */
export const HABITUAL_ORDER_STATUSES = ['delivered', 'closed'] as const

/** Au moins N commandes distinctes livrées/clôturées contenant le produit. */
export const HABITUAL_MIN_DISTINCT_ORDERS = 2

export const HABITUAL_MAX_PRODUCTS = 50

type OrderRow = {
  id: string
  created_at: string
  order_items: Array<{
    product_id: string | null
    cancelled_at: string | null
  }> | null
}

async function filterActiveProductIds(
  supabase: SupabaseClient,
  rankedIds: string[],
): Promise<string[]> {
  if (rankedIds.length === 0) return []

  const { data: activeProducts, error } = await supabase
    .from('products')
    .select('id')
    .in('id', rankedIds)
    .eq('active', true)

  if (error) {
    console.error('habitual filterActiveProductIds:', error.message)
    return []
  }

  const activeIds = new Set((activeProducts ?? []).map(p => p.id as string))
  return rankedIds.filter(id => activeIds.has(id))
}

/**
 * Produits commandés au moins N fois (commandes livrées/clôturées distinctes).
 */
export async function getHabitualProductIdsFromOrders(
  supabase: SupabaseClient,
  memberId: string,
  excludeIds: Set<string>,
): Promise<string[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, order_items(product_id, cancelled_at)')
    .eq('member_id', memberId)
    .in('status', [...HABITUAL_ORDER_STATUSES])

  if (error) {
    console.error('getHabitualProductIdsFromOrders:', error.message)
    return []
  }

  const orderCount = new Map<string, number>()
  const lastOrderedAt = new Map<string, string>()

  for (const order of (orders ?? []) as OrderRow[]) {
    const seenInOrder = new Set<string>()
    for (const item of order.order_items ?? []) {
      if (!item.product_id || item.cancelled_at) continue
      if (excludeIds.has(item.product_id)) continue
      if (seenInOrder.has(item.product_id)) continue
      seenInOrder.add(item.product_id)
      orderCount.set(item.product_id, (orderCount.get(item.product_id) ?? 0) + 1)
      const prev = lastOrderedAt.get(item.product_id)
      if (!prev || order.created_at > prev) {
        lastOrderedAt.set(item.product_id, order.created_at)
      }
    }
  }

  const ranked = [...orderCount.entries()]
    .filter(([, count]) => count >= HABITUAL_MIN_DISTINCT_ORDERS)
    .sort((a, b) => (lastOrderedAt.get(b[0]) ?? '').localeCompare(lastOrderedAt.get(a[0]) ?? ''))
    .slice(0, HABITUAL_MAX_PRODUCTS)
    .map(([productId]) => productId)

  return filterActiveProductIds(supabase, ranked)
}

/** Import auto legacy (source seed) — conservé pour les membres déjà remplis. */
export async function getLegacySeedProductIds(
  supabase: SupabaseClient,
  memberId: string,
  excludeIds: Set<string>,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id, created_at')
    .eq('member_id', memberId)
    .eq('source', 'seed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getLegacySeedProductIds:', error.message)
    return []
  }

  const ids = (data ?? [])
    .map(row => row.product_id as string)
    .filter(id => !excludeIds.has(id))

  return filterActiveProductIds(supabase, ids)
}

/**
 * Suggestions « Vos habituels » : legacy seed + historique ≥ 2 commandes, hors favoris manuels.
 */
export async function getSuggestionProductIds(
  supabase: SupabaseClient,
  memberId: string,
  manualProductIds: string[],
): Promise<string[]> {
  const exclude = new Set(manualProductIds)

  const [legacy, habitual] = await Promise.all([
    getLegacySeedProductIds(supabase, memberId, exclude),
    getHabitualProductIdsFromOrders(supabase, memberId, exclude),
  ])

  const merged: string[] = []
  const seen = new Set<string>()
  for (const id of [...legacy, ...habitual]) {
    if (seen.has(id)) continue
    seen.add(id)
    merged.push(id)
    if (merged.length >= HABITUAL_MAX_PRODUCTS) break
  }

  return merged
}
