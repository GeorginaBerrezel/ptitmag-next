'use client'

import { useCart } from '@/lib/cart/CartContext'
import { Link } from '@/i18n/navigation'

export default function CartIcon({ locale }: { locale: 'fr' | 'en' }) {
  const { totalItems } = useCart()

  // On garde toujours l'espace réservé pour éviter le layout shift dans le Header
  return (
    <Link
      href="/panier"
      locale={locale}
      aria-hidden={totalItems === 0}
      tabIndex={totalItems === 0 ? -1 : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontWeight: 600,
        textDecoration: 'none',
        color: 'inherit',
        opacity: totalItems === 0 ? 0 : 1,
        pointerEvents: totalItems === 0 ? 'none' : 'auto',
        transition: 'opacity 0.15s',
        minWidth: '2.5rem',
      }}
      aria-label={totalItems > 0 ? `Panier : ${totalItems} produit${totalItems > 1 ? 's' : ''}` : undefined}
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
