import type { SupabaseClient } from '@supabase/supabase-js'
import { roundChf } from '@/lib/members/credit'

export function grossTotalFromItems(
  items: Array<{ quantity: number; unit_price: number }>,
): number {
  return roundChf(items.reduce((s, i) => s + i.quantity * i.unit_price, 0))
}

/** Recalcule orders.total = somme des lignes actives − avoir déjà appliqué à la commande. */
export async function syncOrderGrossTotal(
  admin: SupabaseClient,
  orderId: string,
): Promise<number> {
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('credit_applied')
    .eq('id', orderId)
    .single()

  if (orderErr) throw new Error(orderErr.message)

  const { data: items, error } = await admin
    .from('order_items')
    .select('quantity, unit_price')
    .eq('order_id', orderId)
    .is('cancelled_at', null)

  if (error) throw new Error(error.message)

  const gross = grossTotalFromItems(items ?? [])
  const creditApplied = roundChf(Number(order.credit_applied) || 0)
  const total = roundChf(gross - creditApplied)

  const { error: updErr } = await admin
    .from('orders')
    .update({ total })
    .eq('id', orderId)

  if (updErr) throw new Error(updErr.message)
  return total
}
