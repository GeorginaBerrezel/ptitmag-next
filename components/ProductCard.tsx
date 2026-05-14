'use client'

import { useState } from 'react'
import { useCart } from '@/lib/cart/CartContext'
import type { Product } from '@/lib/supabase/products'

function isExpired(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart()
  const [qty, setQty] = useState(product.min_quantity)
  const [added, setAdded] = useState(false)

  const expired = isExpired(product.order_deadline)
  const days = daysLeft(product.order_deadline)
  const inCart = items.some(i => i.productId === product.id)

  function handleAdd() {
    if (!product.supplier || expired) return
    addItem({
      productId: product.id,
      productName: product.name,
      supplierId: product.supplier.id,
      supplierName: product.supplier.name,
      supplierType: product.supplier.type,
      quantity: qty,
      unitPrice: product.unit_price ?? 0,
      unit: product.unit,
      minQuantity: product.min_quantity,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div style={{
      background: expired ? '#fafafa' : '#fff',
      border: '1px solid rgba(16,24,40,0.08)',
      borderRadius: 12,
      padding: '1rem 1.25rem',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '0.75rem',
      alignItems: 'center',
      opacity: expired ? 0.5 : 1,
    }}>
      {/* Infos produit */}
      <div>
        <p style={{ margin: '0 0 0.2rem', fontWeight: 600 }}>{product.name}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {product.supplier && (
            <span style={{ fontSize: '0.8rem', opacity: 0.55 }}>
              {product.supplier.name}
            </span>
          )}
          {product.order_deadline && (
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 500,
              background: expired ? '#fee2e2' : days !== null && days <= 3 ? '#fff3cd' : '#f3f4f6',
              color: expired ? '#c0392b' : days !== null && days <= 3 ? '#92400e' : '#374151',
              borderRadius: 999,
              padding: '0.1rem 0.55rem',
            }}>
              {expired
                ? 'Commande fermée'
                : `Avant le ${new Date(product.order_deadline).toLocaleDateString('fr-CH')}`}
            </span>
          )}
        </div>
      </div>

      {/* Prix + contrôles */}
      <div style={{ display: 'grid', gap: '0.4rem', minWidth: 180, textAlign: 'right' }}>
        {product.unit_price != null && (
          <p style={{ margin: 0, fontWeight: 700 }}>
            CHF {product.unit_price.toFixed(2)}
            <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.85rem' }}>/{product.unit}</span>
          </p>
        )}

        {!expired && (
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <input
              type="number"
              value={qty}
              min={product.min_quantity}
              step={product.min_quantity}
              onChange={e => setQty(Math.max(product.min_quantity, Number(e.target.value)))}
              style={{
                width: 64,
                padding: '0.3rem 0.4rem',
                border: '1px solid rgba(16,24,40,0.15)',
                borderRadius: 6,
                textAlign: 'center',
                fontSize: '0.9rem',
              }}
            />
            <span style={{ fontSize: '0.8rem', opacity: 0.55 }}>{product.unit}</span>
            <button
              onClick={handleAdd}
              style={{
                background: added ? '#2e7d32' : inCart ? '#DC7F00' : '#1a1a2e',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0.35rem 0.75rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {added ? '✓ Ajouté' : inCart ? 'Modifier' : '+ Panier'}
            </button>
          </div>
        )}

        {!expired && (
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5 }}>
            min. {product.min_quantity} {product.unit}
          </p>
        )}
      </div>
    </div>
  )
}
