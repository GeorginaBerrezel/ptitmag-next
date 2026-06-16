'use client'

import { Link } from '@/i18n/navigation'
import WishlistButton from '@/components/WishlistButton'
import type { OrderWithItems } from '@/lib/supabase/auth'
import { previewCreditAtClose } from '@/lib/members/credit'
import { grossTotalFromOrderItems } from '@/lib/orders/order-gross'
import lineStyles from './order-lines.module.css'

const STATUS_HINT: Record<string, { className: string; text: string } | null> = {
  confirmed: {
    className: lineStyles.hintBannerConfirmed,
    text: 'Commande enregistrée — en attente de préparation et de livraison au magasin.',
  },
  delivered: {
    className: lineStyles.hintBannerDelivered,
    text: 'Cochez les produits que vous avez récupérés pour vous organiser (aide-mémoire perso, sans impact sur la commande). Vous pouvez encore ajouter des produits sur place — chaque fournisseur garde sa propre commande.',
  },
  closed: {
    className: lineStyles.hintBannerClosed,
    text: 'Commande clôturée — montant et avoir définitifs. Plus de modification possible.',
  },
  cancelled: null,
}

type PickupChecklistProps = {
  isPicked: (orderItemId: string) => boolean
  onTogglePicked: (orderItemId: string) => void
}

type Props = {
  order: OrderWithItems
  hasCatalogAccess: boolean
  creditBalance?: number
  pickupChecklist?: PickupChecklistProps
}

function activeItems(order: OrderWithItems) {
  return order.order_items.filter(i => !i.cancelled_at)
}

export default function MemberOrderDetail({
  order,
  hasCatalogAccess,
  creditBalance = 0,
  pickupChecklist,
}: Props) {
  const hint = STATUS_HINT[order.status]
  const isProvisional = order.status !== 'closed' && order.status !== 'cancelled'
  const credit = Number(order.credit_applied) || 0
  const items = activeItems(order)
  const grossTotal = grossTotalFromOrderItems(items)
  const preview = isProvisional && creditBalance > 0
    ? previewCreditAtClose(grossTotal, creditBalance)
    : null

  return (
    <div className={lineStyles.orderDetail}>
      {hint && (
        <p className={`${lineStyles.hintBanner} ${hint.className}`}>{hint.text}</p>
      )}

      <div className={lineStyles.orderLines}>
        {items.map(item => {
          const lineTotal = item.quantity * item.unit_price
          const picked = pickupChecklist?.isPicked(item.id) ?? false
          return (
            <div
              key={item.id}
              className={`${lineStyles.orderLine}${pickupChecklist ? ` ${lineStyles.orderLineWithPickup}` : ''}${picked ? ` ${lineStyles.orderLinePicked}` : ''}`}
            >
              {pickupChecklist && (
                <label className={lineStyles.pickupCheck}>
                  <input
                    type="checkbox"
                    checked={picked}
                    onChange={() => pickupChecklist.onTogglePicked(item.id)}
                    aria-label={`J'ai récupéré ${item.product?.name ?? 'ce produit'}`}
                  />
                  <span className={lineStyles.pickupCheckLabel}>Récupéré</span>
                </label>
              )}
              <div className={lineStyles.lineInfo}>
                <span className={lineStyles.lineName}>
                  {item.product?.name ?? '—'}
                </span>
              </div>
              <div className={lineStyles.lineMeta}>
                {item.product?.id && (
                  <WishlistButton
                    productId={item.product.id}
                    productName={item.product.name}
                    compact
                  />
                )}
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
          {isProvisional ? (
            <>
              <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowFinal}`}>
                <span className={lineStyles.totalsFinalLabel}>Total produits</span>
                <span className={lineStyles.totalsFinalAmount}>CHF {grossTotal.toFixed(2)}</span>
              </div>
              {preview && preview.applied > 0 && (
                <>
                  <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowMuted}`}>
                    <span>Avoir sur votre compte</span>
                    <span>CHF {creditBalance.toFixed(2)}</span>
                  </div>
                  <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowCredit}`}>
                    <span>Avoir restant après clôture (estimation)</span>
                    <span>CHF {preview.remaining.toFixed(2)}</span>
                  </div>
                  {preview.payable > 0 && (
                    <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowMuted}`}>
                      <span>À payer au retrait (estimation)</span>
                      <span>CHF {preview.payable.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <p className={lineStyles.totalsHint}>
                Votre avoir sera déduit du solde <strong>à la clôture</strong> de la commande
                (montant définitif après livraison, retraits ou ajouts sur place).
              </p>
            </>
          ) : credit > 0 ? (
            <>
              <div className={`${lineStyles.totalsRow} ${lineStyles.totalsRowMuted}`}>
                <span>Sous-total produits</span>
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
              <span className={lineStyles.totalsFinalLabel}>Total final</span>
              <span className={lineStyles.totalsFinalAmount}>
                CHF {order.total.toFixed(2)}
              </span>
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
