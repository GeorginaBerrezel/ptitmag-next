'use client'

import { useState, useEffect, memo } from 'react'
import Image from 'next/image'
import { useCart, getEffectiveUnitPrice } from '@/lib/cart/CartContext'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'
import { hasUcSurcharge } from '@/lib/catalog/pricing'
import { productOrderableAt } from '@/lib/catalog/orderable'
import { formatSupplierOrderDeadline, supplierOrderStatusLabel } from '@/lib/catalog/supplier-orders'
import { getBiopartnerProductInfoUrl } from '@/lib/catalog/biopartner-product-url'
import { getProductImageUrl, PRODUCT_IMAGE_PLACEHOLDER, showProductImage, isLocalCatalogImage } from '@/lib/catalog/product-image'
import { resolveQuantityRules } from '@/lib/catalog/bioterroir-quantity'
import {
  decrementQuantity,
  formatQuantityDisplay,
  getMinAllowedQuantity,
  incrementQuantity,
  quantityHintText,
} from '@/lib/catalog/quantity-rules'
import type { Product } from '@/lib/supabase/products'
import CielPriceHint from '@/components/catalog/CielPriceHint'
import styles from './ProductCard.module.css'

function daysLeft(deadline: string, nowMs: number): number {
  return Math.ceil((new Date(deadline).getTime() - nowMs) / 86400000)
}

function supplierDeadlineDaysLeft(supplier: Product['supplier'], nowMs: number): number | null {
  if (!supplier?.order_deadline) return null
  return daysLeft(supplier.order_deadline, nowMs)
}

type Props = {
  product: Product
  /** Horloge catalogue partagée (CatalogueClient) — évite Date.now() éparpillé. */
  nowMs?: number
  extendOrderId?: string | null
}

function ProductCardInner({ product, nowMs, extendOrderId = null }: Props) {
  const { addItem, items } = useCart()
  const applyCielMarkup = useApplyCielMarkup()
  const now = nowMs ?? Date.now()
  const [extendLoading, setExtendLoading] = useState(false)
  const [extendDone, setExtendDone] = useState(false)

  const qtyRules = resolveQuantityRules(product)
  const [qty, setQty] = useState(() => getMinAllowedQuantity(qtyRules))
  const [added, setAdded] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(() => getProductImageUrl(product))

  useEffect(() => {
    setImageSrc(getProductImageUrl(product))
  }, [product.id, product.name, product.supplier_ref, product.supplier?.name, product.supplier?.type])

  const orderable = extendOrderId
    ? product.unit_price != null
    : productOrderableAt(product, now)
  const supplierStatus = product.supplier
    ? supplierOrderStatusLabel(product.supplier, now)
    : { isOpen: false, label: 'Commandes fermées' }
  const days = supplierDeadlineDaysLeft(product.supplier, now)
  const inCart = items.some(i => i.productId === product.id)
  const biopartnerInfoUrl = getBiopartnerProductInfoUrl(product)

  const supportsProductImage = showProductImage(product)
  const imageUrl = supportsProductImage
    ? (imageSrc ?? PRODUCT_IMAGE_PLACEHOLDER)
    : null
  const hasImage = supportsProductImage && imageUrl != null
  const imageObjectFit = product.supplier?.type === 'grossiste_bio' ? 'contain' : 'cover'

  const minAllowed = getMinAllowedQuantity(qtyRules)

  const hasSurcharge = hasUcSurcharge({
    minQuantity: qtyRules.minQuantity,
    allowsPartialOrder: qtyRules.allowsPartialOrder,
    quantity: qty,
  })
  const effectivePrice = product.unit_price != null
    ? getEffectiveUnitPrice(
        {
          unitPrice: product.unit_price,
          minQuantity: qtyRules.minQuantity,
          allowsPartialOrder: qtyRules.allowsPartialOrder,
          quantity: qty,
        },
        { applyCielMarkup },
      )
    : null

  const deadlineLabel = (() => {
    if (!product.supplier) return null
    if (orderable && product.supplier.order_deadline) {
      return `Commandez avant le ${formatSupplierOrderDeadline(product.supplier.order_deadline)}`
    }
    if (!orderable) {
      return supplierStatus.detail
        ? `${supplierStatus.label} — ${supplierStatus.detail}`
        : supplierStatus.label
    }
    return null
  })()

  function decrement() {
    setQty(q => decrementQuantity(q, qtyRules))
  }
  function increment() {
    setQty(q => incrementQuantity(q, qtyRules))
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
      minQuantity: qtyRules.minQuantity,
      allowsPartialOrder: qtyRules.allowsPartialOrder,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  async function handleExtendAdd() {
    if (!extendOrderId || effectivePrice == null) return
    setExtendLoading(true)
    try {
      const res = await fetch('/api/member/orders/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: extendOrderId,
          productId: product.id,
          quantity: qty,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ajout impossible')
      setExtendDone(true)
      setTimeout(() => setExtendDone(false), 2500)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setExtendLoading(false)
    }
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
            unoptimized={isLocalCatalogImage(imageUrl)}
            sizes="(max-width: 560px) 88px, 104px"
            style={{ objectFit: imageObjectFit, objectPosition: 'center' }}
            onError={() => {
              if (imageUrl !== PRODUCT_IMAGE_PLACEHOLDER) {
                setImageSrc(PRODUCT_IMAGE_PLACEHOLDER)
              }
            }}
          />
        </div>
      )}

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h2 className={styles.name}>{product.name}</h2>
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
          {biopartnerInfoUrl && (
            <a
              href={biopartnerInfoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.biopartnerInfoLink}
              aria-label={`Allergènes et fiche produit Biopartner pour ${product.name}`}
            >
              Allergènes &amp; fiche Biopartner ↗
            </a>
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
              <div className={styles.priceNotes}>
                {product.supplier?.type === 'grossiste_bio' && (
                  <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.5 }}>
                    Prix TTC
                  </p>
                )}
                {applyCielMarkup && product.unit_price != null && (
                  <CielPriceHint baseUnitPrice={product.unit_price} />
                )}
                {hasSurcharge && (
                  <p className={styles.surchargeNote}>
                    +10&nbsp;% (qté &lt; min.)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {orderable ? (
          <>
            <div
              className={styles.qtyRow}
              role="group"
              aria-label={`Quantité : ${formatQuantityDisplay(qty, qtyRules)} ${product.unit}`}
            >
              <button
                type="button"
                onClick={decrement}
                disabled={qty <= minAllowed}
                aria-label="Diminuer la quantité"
                className={styles.qtyBtn}
              >
                −
              </button>

              <span
                className={styles.qtyValue}
                aria-hidden="true"
              >
                {formatQuantityDisplay(qty, qtyRules)}
              </span>

              <button
                type="button"
                onClick={increment}
                aria-label="Augmenter la quantité"
                className={styles.qtyBtn}
              >
                +
              </button>

              <span className={styles.qtyUnit}>{product.unit}</span>
            </div>

            {extendOrderId ? (
              <button
                type="button"
                onClick={() => void handleExtendAdd()}
                disabled={extendLoading}
                aria-busy={extendLoading}
                className={[
                  styles.addBtn,
                  extendDone ? styles.addBtnAdded : '',
                ].filter(Boolean).join(' ')}
              >
                {extendLoading ? 'Ajout en cours…' : extendDone ? '✓ Ajouté à la commande' : '+ Ajouter à ma commande'}
              </button>
            ) : (
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
            )}

            <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.5, lineHeight: 1.3 }}>
              {extendOrderId
                ? 'Ajout à votre commande livrée de ce fournisseur (total provisoire recalculé).'
                : quantityHintText(qtyRules, product.unit)}
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
