'use client'

import styles from './category-card.module.css'

type Props = {
  name: string
  productCount: number
  orderableCount: number
  active?: boolean
  onClick: () => void
}

export default function CategoryCard({
  name,
  productCount,
  orderableCount,
  active = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${styles.card}${active ? ` ${styles.cardActive}` : ''}`}
    >
      <div className={styles.titleRow}>
        <p className={styles.title}>{name}</p>
        <span className={styles.chevron} aria-hidden>›</span>
      </div>
      <p className={styles.meta}>
        {productCount} produit{productCount > 1 ? 's' : ''}
        {orderableCount > 0 && orderableCount < productCount
          ? ` · ${orderableCount} commandable${orderableCount > 1 ? 's' : ''}`
          : ''}
      </p>
    </button>
  )
}
