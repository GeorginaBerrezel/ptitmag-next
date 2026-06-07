import { grossTotalFromItems } from '@/lib/orders/totals'

export type OrderLineForTotal = {
  quantity: number
  unit_price: number
  cancelled_at?: string | null
}

export function orderGrossTotal(items: OrderLineForTotal[]): number {
  const active = items.filter(i => !i.cancelled_at)
  return grossTotalFromItems(active)
}

export function orderCreditApplied(credit: number | null | undefined): number {
  return Math.round((Number(credit) || 0) * 100) / 100
}

/** Sous-total produits à partir du total net stocké et de l'avoir déjà déduit. */
export function orderGrossFromStored(total: number, credit?: number | null): number {
  return Math.round((total + orderCreditApplied(credit)) * 100) / 100
}

export function orderFinalTotal(
  items: OrderLineForTotal[],
  total: number,
  credit?: number | null,
): number {
  const creditVal = orderCreditApplied(credit)
  if (creditVal > 0) return Math.round(total * 100) / 100
  return orderGrossTotal(items)
}
