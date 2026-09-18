'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart/CartContext'
import { getEffectiveUnitPrice } from '@/lib/cart/CartContext'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'
import { formatShareQty } from '@/lib/sharing/from-product'
import { useSharePrototypeVisible, useSharing } from '@/lib/sharing/SharingContext'
import styles from '@/app/[locale]/(members)/panier/panier.module.css'

export function useYoursReadyShareCount(): number {
  const shareVisible = useSharePrototypeVisible()
  const { readyPools, viewerId } = useSharing()
  if (!shareVisible || !viewerId) return 0
  return readyPools.filter(p => p.contributions.some(c => c.memberId === viewerId && !c.ordered)).length
}

export default function SharingCartSection() {
  const applyCielMarkup = useApplyCielMarkup()
  const shareVisible = useSharePrototypeVisible()
  const { readyPools, viewerId } = useSharing()
  const { items, addItem } = useCart()
  const [addedId, setAddedId] = useState<string | null>(null)

  if (!shareVisible || !viewerId) return null

  const yours = readyPools.filter(p => p.contributions.some(c => c.memberId === viewerId && !c.ordered))
  if (yours.length === 0) return null

  const lines = yours.map(pool => {
    const mine = pool.contributions.find(c => c.memberId === viewerId)!
    const unitPrice = getEffectiveUnitPrice(
      {
        unitPrice: pool.product.unitPrice,
        minQuantity: pool.product.minQuantity,
        allowsPartialOrder: false,
        quantity: mine.quantity,
      },
      { applyCielMarkup },
    )
    const others = pool.contributions
      .filter(c => c.memberId !== viewerId)
      .map(c => c.displayName)
    return {
      poolId: pool.id,
      name: pool.product.name,
      unit: pool.product.unit,
      quantity: mine.quantity,
      unitPrice,
      total: unitPrice * mine.quantity,
      withLabel: others.length === 0 ? 'Toi, pour l’instant' : `Avec ${others.join(', ')}`,
      product: pool.product,
      inCart: items.some(i => i.productId === pool.product.id),
    }
  })
  const shareTotal = lines.reduce((s, l) => s + l.total, 0)

  function putInCart(line: (typeof lines)[number]) {
    const p = line.product
    if (!p.supplierId) return
    addItem({
      productId: p.id,
      productName: p.name,
      supplierRef: p.supplierRef ?? null,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      supplierType: p.supplierType ?? 'autre',
      quantity: line.quantity,
      unitPrice: p.unitPrice,
      unit: p.unit,
      minQuantity: p.minQuantity,
      allowsPartialOrder: false,
      fromShare: true,
    })
    setAddedId(line.poolId)
  }

  return (
    <section className={styles.shareBox} aria-labelledby="share-cart-title">
      <h2 id="share-cart-title" className={styles.shareTitle}>Produits partagés</h2>
      <p className={styles.shareHint}>
        Carton complet. Mets ta part dans le panier pour la commander. Un carton incomplet n’y va pas.
      </p>
      <ul className={styles.shareList}>
        {lines.map(line => (
          <li key={line.poolId} className={styles.shareLine}>
            <div>
              <strong>{line.name}</strong>
              <p className={styles.shareMeta}>
                Ta part : {formatShareQty(line.quantity, line.unit)} · CHF {line.unitPrice.toFixed(2)} / {line.unit}
              </p>
              <p className={styles.shareMeta}>{line.withLabel}</p>
              {line.product.supplierId && (
                <button
                  type="button"
                  className={styles.shareBtn}
                  style={{ marginTop: '0.45rem' }}
                  onClick={() => putInCart(line)}
                  disabled={line.inCart || addedId === line.poolId}
                >
                  {line.inCart || addedId === line.poolId ? 'Déjà dans le panier' : 'Mettre ma part dans le panier'}
                </button>
              )}
            </div>
            <span className={styles.sharePrice}>CHF {line.total.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.shareTotal}>Ton total partagé : CHF {shareTotal.toFixed(2)}</p>
    </section>
  )
}
