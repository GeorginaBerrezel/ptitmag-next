import type { SupabaseClient } from '@supabase/supabase-js'

const ORDER_STATUSES = ['delivered', 'closed'] as const

type OrderRow = {
  created_at: string
  order_items: Array<{
    product_id: string | null
    quantity: number
    cancelled_at: string | null
  }> | null
}

/**
 * Dernière quantité commandée par produit (commandes livrées / clôturées, lignes non retirées).
 * Les commandes les plus récentes sont parcourues en premier.
 */
export async function getLastOrderedQuantities(
  supabase: SupabaseClient,
  memberId: string,
  productIds: string[],
): Promise<Record<string, number>> {
  if (productIds.length === 0) return {}

  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, order_items(product_id, quantity, cancelled_at)')
    .eq('member_id', memberId)
    .in('status', [...ORDER_STATUSES])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getLastOrderedQuantities:', error.message)
    return {}
  }

  const wanted = new Set(productIds)
  const result: Record<string, number> = {}

  for (const order of (orders ?? []) as OrderRow[]) {
    for (const item of order.order_items ?? []) {
      if (!item.product_id || item.cancelled_at) continue
      if (!wanted.has(item.product_id)) continue
      if (result[item.product_id] == null) {
        result[item.product_id] = Number(item.quantity) || 0
      }
    }
    if (Object.keys(result).length === wanted.size) break
  }

  return result
}
