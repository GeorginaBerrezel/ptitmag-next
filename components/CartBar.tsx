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
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: '#1a1a2e',
      color: '#fff',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <span style={{ fontWeight: 500 }}>
        🛒 {totalItems} produit{totalItems > 1 ? 's' : ''} dans le panier
      </span>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>
          CHF {globalTotal.toFixed(2)}
        </span>
        <Link
          href="/panier"
          locale={locale}
          style={{
            background: '#DC7F00',
            color: '#fff',
            borderRadius: 6,
            padding: '0.35rem 1rem',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          Voir le panier →
        </Link>
      </div>
    </div>
  )
}
