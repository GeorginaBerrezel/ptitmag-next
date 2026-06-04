/** Cycle de vie commande : confirmée → livrée → clôturée (ou annulée). */

export const ORDER_STATUS = {
  confirmed: 'confirmed',
  delivered: 'delivered',
  closed: 'closed',
  cancelled: 'cancelled',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export function orderIsModifiable(status: string): boolean {
  return status === ORDER_STATUS.confirmed || status === ORDER_STATUS.delivered
}

export function orderShowsPendingCredit(status: string): boolean {
  return orderIsModifiable(status)
}
