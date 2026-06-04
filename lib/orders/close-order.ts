import type { SupabaseClient } from '@supabase/supabase-js'
import { allocateCreditAcrossTotals, roundChf } from '@/lib/members/credit'
import { ORDER_STATUS } from '@/lib/orders/lifecycle'
import { grossTotalFromItems } from '@/lib/orders/totals'

export type OrderLineForEmail = {
  productName: string
  quantity: number
  unit: string
  unitPrice: number
}

export type CloseOrderResult = {
  grossTotal: number
  creditApplied: number
  total: number
  items: OrderLineForEmail[]
  supplierName: string
  memberId: string
  memberEmail: string | null
  memberName: string | null
}

export async function closeOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<CloseOrderResult> {
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select(`
      id, status, member_id, credit_applied,
      supplier:suppliers(name),
      order_items(
        quantity, unit_price, cancelled_at,
        product:products(name, unit)
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    throw new Error('Commande introuvable.')
  }

  if (order.status !== ORDER_STATUS.delivered) {
    throw new Error('Seules les commandes « Livrées » peuvent être clôturées.')
  }

  const rawItems = (order.order_items as unknown as Array<{
    quantity: number
    unit_price: number
    cancelled_at: string | null
    product: { name: string; unit: string } | null
  }> | null) ?? []

  const active = rawItems.filter(i => !i.cancelled_at)
  if (active.length === 0) {
    throw new Error('Impossible de clôturer une commande sans produit actif.')
  }

  const grossTotal = grossTotalFromItems(active)
  const memberId = order.member_id as string

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('credit_balance, email, full_name, username')
    .eq('id', memberId)
    .single()

  if (profErr || !profile) {
    throw new Error('Profil membre introuvable.')
  }

  const balance = roundChf(Number(profile.credit_balance) || 0)
  const creditApplied = roundChf(allocateCreditAcrossTotals([grossTotal], balance)[0] ?? 0)
  const total = roundChf(grossTotal - creditApplied)
  const closedAt = new Date().toISOString()

  const { error: updErr } = await admin
    .from('orders')
    .update({
      status: ORDER_STATUS.closed,
      closed_at: closedAt,
      total,
      credit_applied: creditApplied,
    })
    .eq('id', orderId)

  if (updErr) throw new Error(updErr.message)

  if (creditApplied > 0) {
    const newBalance = roundChf(balance - creditApplied)
    const { error: creditErr } = await admin
      .from('profiles')
      .update({ credit_balance: newBalance })
      .eq('id', memberId)

    if (creditErr) throw new Error(`Erreur avoir : ${creditErr.message}`)
  }

  const items: OrderLineForEmail[] = active.map(row => ({
    productName: row.product?.name ?? '—',
    quantity: row.quantity,
    unit: row.product?.unit ?? '',
    unitPrice: row.unit_price,
  }))

  let memberEmail = (profile.email as string | null)?.trim() || null
  if (!memberEmail) {
    const { data: authUser } = await admin.auth.admin.getUserById(memberId)
    memberEmail = authUser?.user?.email?.trim() || null
  }

  const memberName =
    (profile.full_name as string | null) ||
    (profile.username as string | null) ||
    null

  return {
    grossTotal,
    creditApplied,
    total,
    items,
    supplierName: (order.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur',
    memberId,
    memberEmail,
    memberName,
  }
}
