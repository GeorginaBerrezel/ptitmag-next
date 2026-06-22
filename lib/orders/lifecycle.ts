/** Cycle de vie commande : confirmée → livrée → clôturée (ou annulée). */

export const ORDER_STATUS = {
  confirmed: 'confirmed',
  delivered: 'delivered',
  closed: 'closed',
  cancelled: 'cancelled',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

/** Onglets admin Commandes où Joel peut retirer une ligne produit. */
export type AdminOrdersMode = 'action' | 'toClose' | 'closed' | 'history'

export function orderIsModifiable(status: string): boolean {
  return status === ORDER_STATUS.confirmed || status === ORDER_STATUS.delivered
}

export function adminOrdersModeAllowsItemRemoval(mode: AdminOrdersMode): boolean {
  return mode === 'action' || mode === 'toClose'
}

export function canAdminRemoveOrderItem(mode: AdminOrdersMode, orderStatus: string): boolean {
  return adminOrdersModeAllowsItemRemoval(mode) && orderIsModifiable(orderStatus)
}

export function orderShowsPendingCredit(status: string): boolean {
  return orderIsModifiable(status)
}
