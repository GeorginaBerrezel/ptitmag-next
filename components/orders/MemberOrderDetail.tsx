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
    text: 'Commande livrée — vous pouvez encore compléter sur place (tous fournisseurs). L\'avoir sera appliqué à la clôture si pas encore déduit.',
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

export default function MemberOrderDetail({ order, hasCatalogAccess }: Props) {
  const hint = STATUS_HINT[order.status]
  const isProvisional = order.status !== 'closed' && order.status !== 'cancelled'
  const credit = Number(order.credit_applied) || 0

  return (
    <div className={lineStyles.orderDetail}>
      {hint && (
        <p className={`${lineStyles.hintBanner} ${hint.className}`}>{hint.text}</p>
      )}

      <div>
        {order.order_items.map(item => {
          const lineTotal = item.quantity * item.unit_price
          return (
            <div key={item.id} className={lineStyles.orderLine}>
              <div className={lineStyles.lineInfo}>
                <span style={{ fontWeight: 600, fontSize: '0.92rem', display: 'block' }}>
                  {item.product?.name ?? '—'}
                </span>
              </div>
              <div className={lineStyles.lineMeta}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {item.quantity} {item.product?.unit}
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', opacity: 0.55 }}>
                  CHF {item.unit_price.toFixed(2)} / unité
                </span>
                <span style={{ display: 'block', fontWeight: 700, marginTop: '0.15rem' }}>
                  CHF {lineTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className={lineStyles.orderTotalRow}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          {isProvisional ? 'Total provisoire' : 'Total final'}
        </span>
        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
          CHF {order.total.toFixed(2)}
          {credit > 0 && (
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#2e7d32', fontWeight: 600 }}>
              Avoir −{credit.toFixed(2)} CHF
            </span>
          )}
        </span>
      </div>

      {(order.status === 'delivered' && hasCatalogAccess && order.supplier?.id) && (
        <div className={lineStyles.orderActions}>
          <Link
            href={`/commandes?extendOrder=${order.id}&supplierId=${order.supplier.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 1rem',
              borderRadius: 999,
              border: 'none',
              background: '#DC7F00',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            + Compléter cette commande
          </Link>
        </div>
      )}
    </div>
  )
}
