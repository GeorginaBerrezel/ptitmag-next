import { orderGrossTotal, type OrderLineForTotal } from '@/lib/orders/order-totals-display'

export function grossTotalFromOrderItems(
  items: OrderLineForTotal[],
): number {
  return orderGrossTotal(items)
}

/** Montant affiché dans les listes : produits seuls tant que la commande n'est pas clôturée. */
export function orderDisplayAmount(
  status: string,
  total: number,
  items: OrderLineForTotal[],
): number {
  if (status === 'closed' || status === 'cancelled') {
    return total
  }
  return grossTotalFromOrderItems(items)
}
