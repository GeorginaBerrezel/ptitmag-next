'use client'

import { Link } from '@/i18n/navigation'
import type { OrderWithItems } from '@/lib/supabase/auth'
import lineStyles from './order-lines.module.css'

const STATUS_HINT: Record<string, { className: string; text: string } | null> = {
  confirmed: {
    className: lineStyles.hintBannerConfirmed,
    text: 'Commande enregistrée — en attente de préparation et de livraison au magasin.',
  },
  delivered: {
    className: lineStyles.hintBannerDelivered,
    text: 'Vous pouvez encore ajouter des produits sur place (tous fournisseurs). Chaque fournisseur garde sa propre commande.',
  },
  closed: {
    className: lineStyles.hintBannerClosed,
    text: 'Commande clôturée — montant et avoir définitifs. Plus de modification possible.',
  },
  cancelled: null,
}

type Props = {
  order: OrderWithItems
  hasCatalogAccess: boolean
}

function activeItems(order: OrderWithItems) {
  return order.order_items.filter(i => !i.cancelled_at)
}

export default function MemberOrderDetail({ order, hasCatalogAccess }: Props) {
  const hint = STATUS_HINT[order.status]
  const isProvisional = order.status !== 'closed' && order.status !== 'cancelled'
  const credit = Number(order.credit_applied) || 0
  const items = activeItems(order)
  const grossTotal = Math.round(
    items.reduce((s, i) => s + i.quantity * i.unit_price, 0) * 100,
  ) / 100
  const showCreditBreakdown = credit > 0 && !isProvisional

  return (
    <div className={lineStyles.orderDetail}>
      {hint && (
        <p className={`${lineStyles.hintBanner} ${hint.className}`}>{hint.text}</p>
      )}

      <div className={lineStyles.orderLines}>
        {items.map(item => {
          const lineTotal = item.quantity * item.unit_price
          return (
            <div key={item.id} className={lineStyles.orderLine}>
              <div className={lineStyles.lineInfo}>
                <span className={lineStyles.lineName}>
                  {item.product?.name ?? '—'}
                </span>
              </div>
              <div className={lineStyles.lineMeta}>
                <span className={lineStyles.lineQty}>
                  {item.quantity} {item.product?.unit}
                </span>
                <span className={lineStyles.lineUnitPrice}>
                  CHF {item.unit_price.toFixed(2)} / unité
                </span>
                <span className={lineStyles.lineTotal}>
                  CHF {lineTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className={lineStyles.detailFooter}>
        <div className={lineStyles.totalsBlock}>
          <p className={lineStyles.totalsLabel}>Récapitulatif</p>
          {showCreditBreakdown ? (
            <>
              <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowMuted}`}>
                <span>Sous-total</span>
                <span>CHF {grossTotal.toFixed(2)}</span>
              </div>
              <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowCredit}`}>
                <span>Avoir déduit</span>
                <span>− CHF {credit.toFixed(2)}</span>
              </div>
              <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowFinal}`}>
                <span className={lineStyles.totalsFinalLabel}>Total à payer</span>
                <span className={lineStyles.totalsFinalAmount}>CHF {order.total.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowFinal}`}>
              <span className={lineStyles.totalsFinalLabel}>
                {isProvisional ? 'Total provisoire' : 'Total final'}
              </span>
              <span className={lineStyles.totalsFinalAmount}>
                CHF {order.total.toFixed(2)}
              </span>
            </div>
          )}
          {credit > 0 && isProvisional && (
            <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowCredit}`}>
              <span>Avoir prévu</span>
              <span>− CHF {credit.toFixed(2)}</span>
            </div>
          )}
        </div>

        {(order.status === 'delivered' && hasCatalogAccess && order.supplier?.id) && (
          <div className={lineStyles.orderActions}>
            <Link
              href={`/commandes?extendOrder=${order.id}&supplierId=${order.supplier.id}`}
              className={lineStyles.complementBtn}
            >
              + Compléter cette commande
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
