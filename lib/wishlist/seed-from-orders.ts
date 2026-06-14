import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/** Commandes prises en compte pour le remplissage auto (une fois). */
const SEED_ORDER_STATUSES = ['delivered', 'closed'] as const

/** Plafond pour éviter une liste trop longue (ex. gros historique Biopartner). */
export const WISHLIST_SEED_MAX_PRODUCTS = 50

type OrderRow = {
  created_at: string
  order_items: Array<{
    product_id: string | null
    cancelled_at: string | null
  }> | null
}

/**
 * Remplit la wishlist depuis l'historique de commandes — une seule fois par membre.
 * Règles : livrées/clôturées, lignes non retirées, produits actifs, max 50, plus récents d'abord.
 */
export async function seedWishlistFromOrdersOnce(
  supabase: SupabaseClient,
  memberId: string,
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('wishlist_seeded_at')
    .eq('id', memberId)
    .single()

  if (profile?.wishlist_seeded_at) return

  const productIds = await collectProductIdsFromOrders(supabase, memberId)

  if (productIds.length > 0) {
    const rows = productIds.map(product_id => ({
      member_id: memberId,
      product_id,
    }))

    const { error: insertError } = await supabase
      .from('wishlist_items')
      .insert(rows)

    if (insertError) {
      console.error('seedWishlistFromOrders insert:', insertError.message)
      return
    }
  }

  const { error: markError } = await createAdminClient()
    .from('profiles')
    .update({ wishlist_seeded_at: new Date().toISOString() })
    .eq('id', memberId)

  if (markError) {
    console.error('seedWishlistFromOrders mark seeded:', markError.message)
  }
}

async function collectProductIdsFromOrders(
  supabase: SupabaseClient,
  memberId: string,
): Promise<string[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, order_items(product_id, cancelled_at)')
    .eq('member_id', memberId)
    .in('status', [...SEED_ORDER_STATUSES])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('seedWishlistFromOrders orders:', error.message)
    return []
  }

  const lastOrderedAt = new Map<string, string>()

  for (const order of (orders ?? []) as OrderRow[]) {
    for (const item of order.order_items ?? []) {
      if (!item.product_id || item.cancelled_at) continue
      if (!lastOrderedAt.has(item.product_id)) {
        lastOrderedAt.set(item.product_id, order.created_at)
      }
    }
  }

  const ranked = [...lastOrderedAt.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, WISHLIST_SEED_MAX_PRODUCTS)
    .map(([productId]) => productId)

  if (ranked.length === 0) return []

  const { data: activeProducts, error: productsError } = await supabase
    .from('products')
    .select('id')
    .in('id', ranked)
    .eq('active', true)

  if (productsError) {
    console.error('seedWishlistFromOrders products:', productsError.message)
    return []
  }

  const activeIds = new Set((activeProducts ?? []).map(p => p.id as string))
  return ranked.filter(id => activeIds.has(id))
}
