'use client'

import { useState, memo } from 'react'
import Image from 'next/image'
import { useCart, getEffectiveUnitPrice } from '@/lib/cart/CartContext'
import { productOrderableAt } from '@/lib/catalog/orderable'
import { formatOrderWindow, nextOrderWindowForSupplier } from '@/lib/catalog/order-windows'
import { getProductImageUrl, showProductImage } from '@/lib/catalog/product-image'
import type { Product } from '@/lib/supabase/products'
import styles from './ProductCard.module.css'

function daysLeft(deadline: string, nowMs: number): number {
  return Math.ceil((new Date(deadline).getTime() - nowMs) / 86400000)
}

type Props = {
  product: Product
  /** Horloge catalogue partagée (CatalogueClient) — évite Date.now() éparpillé. */
  nowMs?: number
}

function ProductCardInner({ product, nowMs }: Props) {
  const { addItem, items } = useCart()
  const now = nowMs ?? Date.now()

  const [qty, setQty] = useState(product.min_quantity)
  const [added, setAdded] = useState(false)

  const orderable = productOrderableAt(product, now)
  const days = product.order_deadline ? daysLeft(product.order_deadline, now) : null
  const inCart = items.some(i => i.productId === product.id)
  const imageUrl = getProductImageUrl(product)
  const hasImage = showProductImage(product) && imageUrl

  const minAllowed = product.allows_partial_order ? 1 : product.min_quantity

  const hasSurcharge = product.allows_partial_order && qty < product.min_quantity
  const effectivePrice = product.unit_price != null
    ? getEffectiveUnitPrice({ unitPrice: product.unit_price, minQuantity: product.min_quantity, allowsPartialOrder: product.allows_partial_order, quantity: qty })
    : null

  const deadlineLabel = (() => {
    if (!product.order_deadline) return null
    if (orderable) {
      return `Commandez avant le ${new Date(product.order_deadline).toLocaleString('fr-CH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    }
    if (product.supplier) {
      const next = formatOrderWindow(nextOrderWindowForSupplier(product.supplier, now))
      return `Commande fermée — prochaine : ${next}`
    }
    return 'Commande fermée'
  })()

  function decrement() {
    setQty(q => Math.max(minAllowed, q - 1))
  }
  function increment() {
    setQty(q => q + 1)
  }

  function handleAdd() {
    if (!product.supplier || !orderable) return
    addItem({
      productId: product.id,
      productName: product.name,
      supplierRef: product.supplier_ref,
      supplierId: product.supplier.id,
      supplierName: product.supplier.name,
      supplierType: product.supplier.type,
      quantity: qty,
      unitPrice: product.unit_price ?? 0,
      unit: product.unit,
      minQuantity: product.min_quantity,
      allowsPartialOrder: product.allows_partial_order,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const cardClass = [
    styles.card,
    !orderable ? styles.cardClosed : '',
    product.is_featured ? styles.cardFeatured : '',
    hasImage ? styles.cardWithImage : styles.cardNoImage,
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>

      {hasImage && imageUrl && (
        <div className={styles.image}>
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 560px) 64px, 72px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <p className={styles.name}>{product.name}</p>
          {product.is_featured && (
            <span style={{
              background: '#DC7F00', color: '#fff',
              fontSize: '0.67rem', fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              padding: '0.15rem 0.5rem', borderRadius: 999,
            }}>
              ⏳ Éphémère
            </span>
          )}
        </div>

        {product.description && (
          <p className={styles.description}>{product.description}</p>
        )}

        <div className={styles.meta}>
          {product.category && (
            <span style={{
              fontSize: '0.73rem', fontWeight: 600,
              background: '#f0f4ff', color: '#3b4fa8',
              borderRadius: 999, padding: '0.1rem 0.5rem',
            }}>
              {product.category}
            </span>
          )}
          {product.supplier_ref && (
            <span style={{ fontSize: '0.75rem', opacity: 0.45 }}>
              Réf. {product.supplier_ref}
            </span>
          )}
          {deadlineLabel && (
            <span style={{
              fontSize: '0.78rem', fontWeight: 500,
              background: orderable
                ? (days !== null && days <= 3 ? '#fff3cd' : '#ecfdf5')
                : '#f3f4f6',
              color: orderable
                ? (days !== null && days <= 3 ? '#92400e' : '#047857')
                : '#4b5563',
              borderRadius: 999, padding: '0.1rem 0.55rem',
              lineHeight: 1.35,
            }}>
              {deadlineLabel}
            </span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        {effectivePrice != null && (
          <div className={styles.priceRow}>
            <div className={styles.priceBlock}>
              <p className={styles.price}>
                CHF {effectivePrice.toFixed(2)}
                <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.85rem' }}>/{product.unit}</span>
              </p>
              {product.supplier?.type === 'grossiste_bio' && (
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.68rem', opacity: 0.5 }}>
                  TVA 2.6% incluse
                </p>
              )}
              {hasSurcharge && (
                <p style={{
                  margin: '0.1rem 0 0',
                  fontSize: '0.72rem',
                  color: '#DC7F00',
                  fontWeight: 600,
                }}>
                  +10% (qté &lt; min.)
                </p>
              )}
            </div>
          </div>
        )}

        {orderable ? (
          <>
            <div className={styles.qtyRow}>
              <button
                type="button"
                onClick={decrement}
                disabled={qty <= minAllowed}
                aria-label="Diminuer la quantité"
                className={styles.qtyBtn}
              >
                −
              </button>

              <span className={styles.qtyValue}>{qty}</span>

              <button
                type="button"
                onClick={increment}
                aria-label="Augmenter la quantité"
                className={styles.qtyBtn}
              >
                +
              </button>

              <span style={{ fontSize: '0.78rem', opacity: 0.55 }}>{product.unit}</span>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={[
                styles.addBtn,
                added ? styles.addBtnAdded : '',
                !added && inCart ? styles.addBtnInCart : '',
              ].filter(Boolean).join(' ')}
            >
              {added ? '✓ Ajouté' : inCart ? '✎ Modifier' : '+ Panier'}
            </button>

            <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.5, lineHeight: 1.3 }}>
              {product.allows_partial_order
                ? `min. sans majoration : ${product.min_quantity} ${product.unit}`
                : `minimum : ${product.min_quantity} ${product.unit}`}
            </p>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.55, lineHeight: 1.35 }}>
            Commande indisponible pour le moment
          </p>
        )}
      </div>
    </div>
  )
}

const ProductCard = memo(ProductCardInner)
export default ProductCard
