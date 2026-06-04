'use client'

import { useState, useEffect, memo } from 'react'
import type { Product } from '@/lib/supabase/products'
import ProductCard from '../ProductCard'

const PAGE_SIZE = 40

type Props = {
  products: Product[]
  nowMs: number
  extendOrderId?: string | null
}

function ProductListInner({ products, nowMs, extendOrderId = null }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [products])

  const visible = products.slice(0, visibleCount)
  const remaining = products.length - visibleCount

  return (
    <>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {visible.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            nowMs={nowMs}
            extendOrderId={extendOrderId}
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
