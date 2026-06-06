'use client'

import { useCart } from '@/lib/cart/CartContext'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import styles from './cart-icon.module.css'

function CartSvg() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6h15l-1.5 9H7.5L6 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M6 6 5 3H2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    </svg>
  )
}

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
      className={styles.link}
      aria-label={`${t('cart')} : ${totalItems} produit${totalItems > 1 ? 's' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <CartSvg />
      <span className={styles.badge}>{totalItems}</span>
    </Link>
  )
}
