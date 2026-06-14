'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useWishlist } from '@/lib/wishlist/WishlistContext'
import styles from './cart-icon.module.css'

function HeartSvg() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 21s-6.7-4.35-9.33-8.1C.74 10.1 2.1 6.4 5.6 5.2c2-.7 4.1-.1 5.5 1.4L12 8.5l.9-1.9c1.4-1.5 3.5-2.1 5.5-1.4 3.5 1.2 4.85 4.9 2.93 7.7C18.7 16.65 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WishlistIcon({ locale }: { locale: 'fr' | 'en' }) {
  const { count } = useWishlist()
  const t = useTranslations('nav')
  const pathname = usePathname()
  const isActive = pathname === '/mes-favoris' || pathname.startsWith('/mes-favoris/')

  return (
    <Link
      href="/mes-favoris"
      locale={locale}
      className={styles.link}
      aria-label={
        count > 0
          ? `${t('wishlist')} : ${count} produit${count > 1 ? 's' : ''}`
          : t('wishlist')
      }
      aria-current={isActive ? 'page' : undefined}
    >
      <HeartSvg />
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </Link>
  )
}
