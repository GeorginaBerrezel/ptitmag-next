'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart/CartContext'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import styles from './cart-icon.module.css'

type Props = {
  locale: 'fr' | 'en'
  variant?: 'icon' | 'mobile'
}

export default function CartIcon({ locale, variant = 'icon' }: Props) {
  const { totalItems } = useCart()
  const t = useTranslations('nav')
  const pathname = usePathname()
  const isActive = pathname === '/panier' || pathname.startsWith('/panier/')
  const isMobile = variant === 'mobile'
  const label = t('cart')

  if (totalItems === 0) return null

  return (
    <Link
      href="/panier"
      locale={locale}
      className={[styles.link, isMobile ? styles.linkMobile : ''].filter(Boolean).join(' ')}
      aria-label={
        isMobile
          ? undefined
          : `${label} : ${totalItems} produit${totalItems > 1 ? 's' : ''}`
      }
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={styles.iconWrap}>
        <ShoppingCart className={styles.icon} size={22} strokeWidth={2} aria-hidden="true" />
        <span className={styles.badge}>{totalItems}</span>
      </span>
      {isMobile && <span className={styles.label}>{label}</span>}
    </Link>
  )
}
