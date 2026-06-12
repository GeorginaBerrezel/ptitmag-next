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
        <span style={{ fontSize: '1.1rem', opacity: 0.35, lineHeight: 1, flexShrink: 0 }} aria-hidden>›</span>
      </div>

      <div className={styles.footer}>
        <p className={styles.stats}>
          {productCount} produit{productCount > 1 ? 's' : ''}
          {' · '}
          {categoryCount} catégorie{categoryCount > 1 ? 's' : ''}
        </p>
        <span className={isOpen ? styles.statusOpen : styles.statusClosed}>
          {statusLabel}
        </span>
      </div>

      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#DC7F00' }}>
        Voir le catalogue →
      </span>
    </button>
  )
}
