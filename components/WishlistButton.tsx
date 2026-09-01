'use client'

import { Heart } from 'lucide-react'
import { useWishlist } from '@/lib/wishlist/WishlistContext'
import styles from './wishlist-button.module.css'

type Props = {
  productId: string
  productName?: string
  compact?: boolean
  onDark?: boolean
  className?: string
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
      <Heart
        className={compact ? `${styles.icon} ${styles.iconCompact}` : styles.icon}
        size={compact ? 20 : 22}
        strokeWidth={2}
        fill={favorited ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
    </button>
  )
}
