'use client'

import { useCart } from '@/lib/cart/CartContext'
import { Link } from '@/i18n/navigation'

export default function CartIcon({ locale }: { locale: 'fr' | 'en' }) {
  const { totalItems } = useCart()

  if (totalItems === 0) return null

  return (
    <Link
      href="/panier"
      locale={locale}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontWeight: 600,
        textDecoration: 'none',
        color: 'inherit',
      }}
      aria-label={`Panier : ${totalItems} produit${totalItems > 1 ? 's' : ''}`}
    >
      🛒
      <span style={{
        background: '#DC7F00',
        color: '#fff',
        borderRadius: 999,
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '0.1rem 0.45rem',
        lineHeight: 1.4,
      }}>
        {totalItems}
      </span>
    </Link>
  )
}
