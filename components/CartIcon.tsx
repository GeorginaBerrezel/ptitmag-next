'use client'

import { useCart } from '@/lib/cart/CartContext'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

export default function CartIcon({ locale }: { locale: 'fr' | 'en' }) {
  const { totalItems } = useCart()
  const t = useTranslations('nav')
  const pathname = usePathname()
  const isActive = pathname === '/panier' || pathname.startsWith('/panier/')

  if (totalItems === 0) return null

  return (
    <Link
      href="/panier"
      locale={locale}
      aria-label={`${t('cart')} : ${totalItems} produit${totalItems > 1 ? 's' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontWeight: 600,
        textDecoration: 'none',
        color: 'inherit',
        minWidth: '2.75rem',
        minHeight: '44px',
        padding: '0.35rem 0.5rem',
      }}
    >
      <span aria-hidden="true">🛒</span>
      <span style={{
        background: '#DC7F00',
        color: '#fff',
        borderRadius: 999,
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '0.1rem 0.45rem',
        lineHeight: 1.4,
        minWidth: '1.25rem',
        textAlign: 'center',
      }}>
        {totalItems}
      </span>
    </Link>
  )
}
