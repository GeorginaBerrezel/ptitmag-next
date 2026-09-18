'use client'

import { Link } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useSharePrototypeVisible, useSharing } from '@/lib/sharing/SharingContext'
import styles from './sharing.module.css'

/** Pastille vers Partages, seulement s’il y a déjà un carton. */
export function ShareCatalogEntry() {
  const t = useTranslations()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const visible = useSharePrototypeVisible()
  const { openPools, readyPools } = useSharing()
  if (!visible) return null

  const count = openPools.length + readyPools.length
  if (count === 0) return null

  return (
    <p className={styles.entryWrap}>
      <Link href="/commandes/partage" locale={locale} className={styles.entry}>
        {t('nav.sharing')}
        <span className={styles.entryCount}>{count}</span>
      </Link>
    </p>
  )
}

type FilterProps = {
  shareOnly: boolean
  onShareOnlyChange: (value: boolean) => void
}

/** Filtre visible seulement quand une liste de produits est à l’écran. */
export function ShareOnlyFilter({ shareOnly, onShareOnlyChange }: FilterProps) {
  const t = useTranslations('sharing')
  const visible = useSharePrototypeVisible()
  if (!visible) return null

  return (
    <label className={styles.filterToggle}>
      <input
        type="checkbox"
        checked={shareOnly}
        onChange={e => onShareOnlyChange(e.target.checked)}
      />
      {t('filterOnly')}
    </label>
  )
}
