import type { SupabaseClient } from '@supabase/supabase-js'
import { roundChf } from '@/lib/members/credit'
import { applyCreditDelta } from '@/lib/members/credit-ledger'

export function grossTotalFromItems(
  items: Array<{ quantity: number; unit_price: number }>,
): number {
  return roundChf(items.reduce((s, i) => s + i.quantity * i.unit_price, 0))
}

/**
 * Recalcule orders.total après modification des lignes.
 * Commande non clôturée → total = sous-total produits (avoir déduit seulement à la clôture).
 * Commande clôturée → total = produits − avoir déjà appliqué.
 */
export async function syncOrderGrossTotal(
  admin: SupabaseClient,
  orderId: string,
): Promise<number> {
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('status, credit_applied, member_id')
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
  const status = order.status as string
  const legacyCredit = roundChf(Number(order.credit_applied) || 0)
  const memberId = order.member_id as string

  if (status !== 'closed') {
    if (legacyCredit > 0) {
      await applyCreditDelta(admin, {
        memberId,
        delta: legacyCredit,
        kind: 'order_restore',
        note: 'Avoir recrédité (commande non clôturée)',
        orderId,
      })
    }

    const { error: updErr } = await admin
      .from('orders')
      .update({ total: gross, credit_applied: 0 })
      .eq('id', orderId)

    if (updErr) throw new Error(updErr.message)
    return gross
  }

  const creditApplied = roundChf(Math.min(legacyCredit, gross))
  const total = roundChf(gross - creditApplied)

  const { error: updErr } = await admin
    .from('orders')
    .update({ total, credit_applied: creditApplied })
    .eq('id', orderId)

  if (updErr) throw new Error(updErr.message)
  return total
}
