'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart, getEffectiveUnitPrice } from '@/lib/cart/CartContext'
import { productOrderableAt } from '@/lib/catalog/orderable'
import { formatOrderWindow, nextOrderWindowForSupplier } from '@/lib/catalog/order-windows'
import { getProductImageUrl, showProductImage } from '@/lib/catalog/product-image'
import type { Product } from '@/lib/supabase/products'

function daysLeft(deadline: string, nowMs: number): number {
  return Math.ceil((new Date(deadline).getTime() - nowMs) / 86400000)
}

type Props = {
  product: Product
  /** Horloge catalogue partagée (CatalogueClient) — évite Date.now() éparpillé. */
  nowMs?: number
}

export default function ProductCard({ product, nowMs }: Props) {
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
      return `Commande fermée — prochaine fenêtre : ${next}`
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

  return (
    <div style={{
      background: orderable ? '#fff' : '#fafafa',
      border: product.is_featured
        ? '2px solid #DC7F00'
        : '1px solid rgba(16,24,40,0.08)',
      borderRadius: 12,
      padding: '0.875rem 1rem',
      display: 'grid',
      gridTemplateColumns: hasImage ? '72px 1fr auto' : '1fr auto',
      gap: '0.75rem',
      alignItems: 'start',
    }}>

      {hasImage && imageUrl && (
        <div style={{
          width: 72, height: 72, borderRadius: 10, overflow: 'hidden',
          background: '#f3f4f6', border: '1px solid rgba(16,24,40,0.06)',
          flexShrink: 0, position: 'relative',
        }}>
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="72px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{product.name}</p>
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
          <p style={{ margin: '0.1rem 0 0.35rem', fontSize: '0.8rem', opacity: 0.58, lineHeight: 1.4 }}>
            {product.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
            }}>
              {deadlineLabel}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.4rem', minWidth: 0, textAlign: 'right' }}>
        {effectivePrice != null && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>
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
        )}

        {orderable ? (
          <>
            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={decrement}
                disabled={qty <= minAllowed}
                aria-label="Diminuer la quantité"
                style={{
                  width: 30, height: 30,
                  border: '1px solid rgba(16,24,40,0.15)',
                  borderRadius: 6,
                  background: qty <= minAllowed ? '#f5f5f5' : '#fff',
                  color: qty <= minAllowed ? '#bbb' : '#1a1a2e',
                  cursor: qty <= minAllowed ? 'not-allowed' : 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                −
              </button>

              <span style={{
                minWidth: 36,
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.95rem',
                lineHeight: '30px',
              }}>
                {qty}
              </span>

              <button
                onClick={increment}
                aria-label="Augmenter la quantité"
                style={{
                  width: 30, height: 30,
                  border: '1px solid rgba(16,24,40,0.15)',
                  borderRadius: 6,
                  background: '#fff',
                  color: '#1a1a2e',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                +
              </button>

              <span style={{ fontSize: '0.78rem', opacity: 0.55, marginLeft: '0.1rem' }}>{product.unit}</span>
            </div>

            <button
              onClick={handleAdd}
              style={{
                background: added ? '#2e7d32' : inCart ? '#DC7F00' : '#1a1a2e',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
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
