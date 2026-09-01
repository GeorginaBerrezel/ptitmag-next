'use client'

import { Heart } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useWishlist } from '@/lib/wishlist/WishlistContext'
import styles from './cart-icon.module.css'

type Props = {
  locale: 'fr' | 'en'
  variant?: 'icon' | 'mobile'
}

export default function WishlistIcon({ locale, variant = 'icon' }: Props) {
  const { count } = useWishlist()
  const t = useTranslations('nav')
  const pathname = usePathname()
  const isActive = pathname === '/mes-favoris' || pathname.startsWith('/mes-favoris/')
  const isMobile = variant === 'mobile'
  const label = t('wishlist')

  return (
    <Link
      href="/mes-favoris"
      locale={locale}
      className={[styles.link, isMobile ? styles.linkMobile : ''].filter(Boolean).join(' ')}
      aria-label={
        isMobile
          ? undefined
          : count > 0
            ? `${label} : ${count} produit${count > 1 ? 's' : ''}`
            : label
      }
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={styles.iconWrap}>
        <Heart className={styles.icon} size={22} strokeWidth={2} aria-hidden="true" />
        {count > 0 && <span className={styles.badge}>{count}</span>}
      </span>
      {isMobile && <span className={styles.label}>{label}</span>}
    </Link>
  )
}
