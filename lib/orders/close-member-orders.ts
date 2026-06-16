import type { SupabaseClient } from '@supabase/supabase-js'
import { roundChf } from '@/lib/members/credit'
import { ORDER_STATUS } from '@/lib/orders/lifecycle'
import { grossTotalFromItems } from '@/lib/orders/totals'
import { closeOrder, type CloseOrderResult } from '@/lib/orders/close-order'
import { computeMemberCloseCredits } from '@/lib/orders/compute-member-close-credits'

export type CloseMemberOrdersResult = {
  closedGroups: CloseOrderResult[]
  globalGrossTotal: number
  globalCreditApplied: number
  globalTotal: number
}

const ORDER_SELECT = `
  id, status, member_id, credit_applied,
  supplier:suppliers(name),
  order_items(
    quantity, unit_price, cancelled_at,
    product:products(name, unit)
  )
`

type RawOrderItem = {
  quantity: number
  unit_price: number
  cancelled_at: string | null
  product: { name: string; unit: string } | null
}

export async function closeMemberOrders(
  admin: SupabaseClient,
  memberId: string,
): Promise<CloseMemberOrdersResult> {
  const { data: orders, error: ordersErr } = await admin
    .from('orders')
    .select(ORDER_SELECT)
    .eq('member_id', memberId)
    .eq('status', ORDER_STATUS.delivered)
    .is('archived_at', null)
    .order('created_at', { ascending: true })

  if (ordersErr) throw new Error(ordersErr.message)

  const delivered = (orders ?? []).filter(order => {
    const rawItems = (order.order_items as unknown as RawOrderItem[] | null) ?? []
    return rawItems.some(i => !i.cancelled_at)
  })

  if (delivered.length === 0) {
    throw new Error('Aucune commande livrée à clôturer pour ce membre.')
  }

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('credit_balance')
    .eq('id', memberId)
    .single()

  if (profErr || !profile) {
    throw new Error('Profil membre introuvable.')
  }

  const creditInputs = delivered.map(order => {
    const rawItems = (order.order_items as unknown as RawOrderItem[] | null) ?? []
    const active = rawItems.filter(i => !i.cancelled_at)
    return {
      grossTotal: grossTotalFromItems(active),
      storedCredit: roundChf(Number(order.credit_applied) || 0),
    }
  })

  const initialBalance = roundChf(Number(profile.credit_balance) || 0)
  const plan = computeMemberCloseCredits(creditInputs, initialBalance)

  const { error: balanceErr } = await admin
    .from('profiles')
    .update({ credit_balance: plan.balanceAfter })
    .eq('id', memberId)

  if (balanceErr) throw new Error(`Erreur avoir : ${balanceErr.message}`)

  const closedGroups: CloseOrderResult[] = []
  for (let i = 0; i < delivered.length; i++) {
    const orderId = delivered[i].id as string
    const result = await closeOrder(admin, orderId, {
      presetCreditApplied: plan.creditPerOrder[i],
      skipCreditBalanceUpdate: true,
    })
    closedGroups.push(result)
  }

  return {
    closedGroups,
    globalGrossTotal: plan.totalGross,
    globalCreditApplied: plan.totalCreditApplied,
    globalTotal: plan.totalPayable,
  }
}
