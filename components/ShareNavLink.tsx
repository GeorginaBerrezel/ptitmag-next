'use client'

import { Users } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useSharePrototypeVisible, useSharingOptional } from '@/lib/sharing/SharingContext'
import styles from '@/components/cart-icon.module.css'

type Props = {
  locale: 'fr' | 'en'
  onNavigate?: () => void
  variant?: 'icon' | 'mobile'
}

export default function ShareNavLink({ locale, onNavigate, variant = 'icon' }: Props) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const visible = useSharePrototypeVisible()
  const sharing = useSharingOptional()

  if (!visible) return null

  const isActive = pathname === '/commandes/partage' || pathname.startsWith('/commandes/partage/')
  const count = sharing ? sharing.openPools.length + sharing.readyPools.length : 0
  const isMobile = variant === 'mobile'
  const label = t('sharing')

  return (
    <Link
      href="/commandes/partage"
      locale={locale}
      className={[styles.link, isMobile ? styles.linkMobile : ''].filter(Boolean).join(' ')}
      onClick={onNavigate}
      aria-label={
        isMobile
          ? undefined
          : count > 0
            ? `${label} : ${count}`
            : label
      }
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={styles.iconWrap}>
        <Users className={styles.icon} size={22} strokeWidth={2} aria-hidden="true" />
        {count > 0 ? <span className={styles.badge}>{count}</span> : null}
      </span>
      {isMobile && <span className={styles.label}>{label}</span>}
    </Link>
  )
}
