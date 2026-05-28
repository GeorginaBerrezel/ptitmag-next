/** Commandes ouvertes/fermées par fournisseur (contrôle Joel). */

export type SupplierOrderSettings = {
  orders_open?: boolean | null
  order_deadline?: string | null
}

/** true si Joel a ouvert les commandes et le délai n'est pas dépassé. */
export function supplierOrdersOpenAt(
  supplier: SupplierOrderSettings,
  nowMs: number,
): boolean {
  if (!supplier.orders_open) return false
  if (supplier.order_deadline) {
    return new Date(supplier.order_deadline).getTime() >= nowMs
  }
  return true
}

export function formatSupplierOrderDeadline(
  iso: string | null | undefined,
  locale = 'fr-CH',
): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Libellé carte fournisseur côté membre. */
export function supplierOrderStatusLabel(
  supplier: SupplierOrderSettings,
  nowMs: number,
): { isOpen: boolean; label: string } {
  if (supplierOrdersOpenAt(supplier, nowMs)) {
    const deadline = supplier.order_deadline
    if (deadline) {
      return {
        isOpen: true,
        label: `Commandes ouvertes — jusqu'au ${formatSupplierOrderDeadline(deadline)}`,
      }
    }
    return { isOpen: true, label: 'Commandes ouvertes' }
  }

  if (supplier.orders_open && supplier.order_deadline) {
    return { isOpen: false, label: 'Commandes fermées — délai dépassé' }
  }

  return { isOpen: false, label: 'Commandes fermées' }
}
