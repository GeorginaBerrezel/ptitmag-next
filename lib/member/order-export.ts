/** Export CSV léger — historique commandes adhérent. */

import { csvCell } from '@/lib/admin/order-export'
import type { OrderWithItems } from '@/lib/supabase/auth'

export const MEMBER_EXPORT_HEADERS = [
  'Date',
  'Fournisseur',
  'Statut',
  'Produit',
  'Quantité',
  'Unité',
  'Prix unitaire (CHF)',
  'Total ligne (CHF)',
  'Total commande (CHF)',
] as const

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmée',
  delivered: 'Livrée',
  closed: 'Clôturée',
  cancelled: 'Annulée',
}

function formatExportDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function buildMemberOrderExportCsv(orders: OrderWithItems[]): string {
  const lines = [MEMBER_EXPORT_HEADERS.join(';')]

  for (const order of orders) {
    const date = formatExportDate(order.created_at)
    const supplier = order.supplier?.name ?? '—'
    const status = STATUS_LABEL[order.status] ?? order.status
    const orderTotal = order.total.toFixed(2)

    if (order.order_items.length === 0) {
      lines.push(
        [
          csvCell(date),
          csvCell(supplier),
          csvCell(status),
          csvCell('—'),
          csvCell(0),
          csvCell(''),
          csvCell(''),
          csvCell(''),
          csvCell(orderTotal),
        ].join(';'),
      )
      continue
    }

    order.order_items.forEach((item, index) => {
      const lineTotal = (item.quantity * item.unit_price).toFixed(2)
      lines.push(
        [
          csvCell(date),
          csvCell(supplier),
          csvCell(status),
          csvCell(item.product?.name ?? '—'),
          csvCell(item.quantity),
          csvCell(item.product?.unit ?? ''),
          csvCell(item.unit_price.toFixed(2)),
          csvCell(lineTotal),
          csvCell(index === 0 ? orderTotal : ''),
        ].join(';'),
      )
    })
  }

  return lines.join('\n')
}
