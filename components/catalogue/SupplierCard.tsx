'use client'

import ProducerAvatar from '@/components/ProducerAvatar'
import styles from './supplier-card.module.css'

type Props = {
  name: string
  typeLabel: string
  description?: string
  emoji?: string
  logo?: string
  productCount: number
  categoryCount: number
  isOpen: boolean
  statusLabel: string
  statusDetail?: string
  onClick: () => void
}

export default function SupplierCard({
  name,
  typeLabel,
  description,
  emoji,
  logo,
  productCount,
  categoryCount,
  isOpen,
  statusLabel,
  statusDetail,
  onClick,
}: Props) {
  return (
    <button type="button" onClick={onClick} className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.identity}>
          {emoji && (
            <ProducerAvatar logo={logo} emoji={emoji} name={name} size={44} />
          )}
          <div className={styles.textBlock}>
            <p className={styles.name}>{name}</p>
            <p className={styles.typeLabel}>{typeLabel}</p>
            {description && (
              <p className={styles.description}>{description}</p>
            )}
          </div>
        </div>
        <span className={styles.chevron} aria-hidden>›</span>
      </div>

      <div className={styles.footer}>
        <p className={styles.stats}>
          {productCount} produit{productCount > 1 ? 's' : ''}
          {' · '}
          {categoryCount} catégorie{categoryCount > 1 ? 's' : ''}
        </p>
        <span className={isOpen ? styles.statusOpen : styles.statusClosed}>
          <span className={styles.statusTitle}>{statusLabel}</span>
          {statusDetail && (
            <span className={styles.statusDetail}>{statusDetail}</span>
          )}
        </span>
      </div>

      <span className={styles.cta}>
        Voir le catalogue →
      </span>
    </button>
  )
}
