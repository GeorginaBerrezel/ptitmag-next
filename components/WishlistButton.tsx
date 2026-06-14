'use client'

import { useWishlist } from '@/lib/wishlist/WishlistContext'
import styles from './wishlist-button.module.css'

type Props = {
  productId: string
  productName?: string
  compact?: boolean
  onDark?: boolean
  className?: string
}

function HeartIcon({ filled, compact }: { filled: boolean; compact?: boolean }) {
  const iconClass = compact ? `${styles.icon} ${styles.iconCompact}` : styles.icon
  if (filled) {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 21s-6.7-4.35-9.33-8.1C.74 10.1 2.1 6.4 5.6 5.2c2-.7 4.1-.1 5.5 1.4L12 8.5l.9-1.9c1.4-1.5 3.5-2.1 5.5-1.4 3.5 1.2 4.85 4.9 2.93 7.7C18.7 16.65 12 21 12 21Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-6.7-4.35-9.33-8.1C.74 10.1 2.1 6.4 5.6 5.2c2-.7 4.1-.1 5.5 1.4L12 8.5l.9-1.9c1.4-1.5 3.5-2.1 5.5-1.4 3.5 1.2 4.85 4.9 2.93 7.7C18.7 16.65 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WishlistButton({
  productId,
  productName,
  compact = false,
  onDark = false,
  className,
}: Props) {
  const { enabled, isFavorited, toggle, togglingId } = useWishlist()

  if (!enabled) return null

  const favorited = isFavorited(productId)
  const busy = togglingId === productId
  const label = productName?.trim()
    ? (favorited ? `Retirer ${productName} des favoris` : `Ajouter ${productName} aux favoris`)
    : (favorited ? 'Retirer des favoris' : 'Ajouter aux favoris')

  const btnClass = [
    styles.btn,
    compact ? styles.btnCompact : '',
    onDark ? styles.btnOnDark : '',
    favorited ? styles.btnActive : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={btnClass}
      onClick={() => void toggle(productId)}
      disabled={busy}
      aria-pressed={favorited}
      aria-busy={busy}
      aria-label={label}
      title={label}
    >
      <HeartIcon filled={favorited} compact={compact} />
    </button>
  )
}
