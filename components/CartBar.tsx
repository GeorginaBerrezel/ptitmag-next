'use client'

import { useCart } from '@/lib/cart/CartContext'
import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'

export default function CartBar() {
  const { totalItems, globalTotal } = useCart()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'

  if (totalItems === 0) return null

  return (
    <div
      className="cart-bar-sticky"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: '#1a1a2e',
        color: '#fff',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >
      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
        <span aria-hidden="true">🛒 </span>
        <span>{totalItems} produit{totalItems > 1 ? 's' : ''}</span>
      </span>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: 'auto' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          CHF {globalTotal.toFixed(2)}
        </span>
        <Link
          href="/panier"
          locale={locale}
          aria-label={`Voir le panier — ${totalItems} produit${totalItems > 1 ? 's' : ''}, CHF ${globalTotal.toFixed(2)}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            background: '#DC7F00',
            color: '#fff',
            borderRadius: 6,
            padding: '0.45rem 1rem',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
          }}
        >
          Voir le panier →
        </Link>
      </div>
    </div>
  )
}
