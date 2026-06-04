import type { SupabaseClient } from '@supabase/supabase-js'
import { roundChf } from '@/lib/members/credit'

export function grossTotalFromItems(
  items: Array<{ quantity: number; unit_price: number }>,
): number {
  return roundChf(items.reduce((s, i) => s + i.quantity * i.unit_price, 0))
}

/** Recalcule orders.total = somme des lignes actives (HT/TTC catalogue, sans avoir). */
export async function syncOrderGrossTotal(
  admin: SupabaseClient,
  orderId: string,
): Promise<number> {
  const { data: items, error } = await admin
    .from('order_items')
    .select('quantity, unit_price')
    .eq('order_id', orderId)
    .is('cancelled_at', null)

  if (error) throw new Error(error.message)

  const gross = grossTotalFromItems(items ?? [])
  const { error: updErr } = await admin
    .from('orders')
    .update({ total: gross })
    .eq('id', orderId)

  if (updErr) throw new Error(updErr.message)
  return gross
}
