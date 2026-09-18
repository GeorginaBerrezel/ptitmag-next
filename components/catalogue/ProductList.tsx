'use client'

import { useState, useEffect, memo } from 'react'
import type { Product } from '@/lib/supabase/products'
import { resolveQuantityRules } from '@/lib/catalog/bioterroir-quantity'
import { isShareEligible } from '@/lib/sharing/eligibility'
import { useSharePrototypeVisible } from '@/lib/sharing/SharingContext'
import ProductCard from '../ProductCard'

const PAGE_SIZE = 40

type Props = {
  products: Product[]
  /** Horloge partagée (catalogue). Si omis, fixée au montage client. */
  nowMs?: number
  extendOrderId?: string | null
  /** Recherche globale — affiche le fournisseur sur chaque fiche produit. */
  showSupplier?: boolean
  /** N’afficher que les lots et gros formats. */
  shareOnly?: boolean
}

function ProductListInner({
  products,
  nowMs: nowMsProp,
  extendOrderId = null,
  showSupplier = false,
  shareOnly = false,
}: Props) {
  const [clientNowMs] = useState(() => Date.now())
  const nowMs = nowMsProp ?? clientNowMs
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const shareVisible = useSharePrototypeVisible()
  const canShare = shareVisible && extendOrderId == null && shareOnly

  const list = canShare
    ? products.filter(p => isShareEligible({
      minQuantity: resolveQuantityRules(p).minQuantity,
      unit: p.unit,
      unitPrice: p.unit_price,
    }))
    : products

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [products, shareOnly])

  const visible = list.slice(0, visibleCount)
  const remaining = list.length - visibleCount

  return (
    <>
      {canShare && list.length === 0 && (
        <p role="status" style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', opacity: 0.7 }}>
          Aucun produit à partager ici. Change de catégorie, ou décoche le filtre.
        </p>
      )}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {visible.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            nowMs={nowMs}
            extendOrderId={extendOrderId}
            showSupplier={showSupplier}
          />
        ))}
      </div>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="btn btn-primary"
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          Afficher plus ({remaining} restant{remaining > 1 ? 's' : ''})
        </button>
      )}
    </>
  )
}

const ProductList = memo(ProductListInner)
export default ProductList
