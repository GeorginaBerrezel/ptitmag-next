'use client'

import { useState } from 'react'
import styles from './Avatar.module.css'

const AVATAR_COLORS = [
  '#DC7F00', '#2e7d32', '#1565c0', '#6a1b9a',
  '#c62828', '#00838f', '#ad1457', '#4e342e',
]

function getColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email[0].toUpperCase()
  return '?'
}

type AvatarProps = {
  src?: string | null
  name?: string | null
  email?: string | null
  userId?: string | null
  size?: number
  onClick?: () => void
  /** Survol : overlay « modifier » (sans tooltip nom parasite). */
  editable?: boolean
  editLabel?: string
}

export default function Avatar({
  src,
  name,
  email,
  userId,
  size = 40,
  onClick,
  editable = false,
  editLabel = 'Changer',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const initials = getInitials(name, email)
  const bg = getColor(userId ?? email ?? name ?? '?')
  const fontSize = Math.round(size * 0.38)
  const overlayFontSize = Math.max(10, Math.round(size * 0.18))
  const showImage = src && !imgError
  const title = editable ? undefined : (name ?? email ?? undefined)

  return (
    <div
      onClick={onClick}
      title={title}
      className={`${styles.wrap} ${onClick ? styles.clickable : ''}`}
      style={{ width: size, height: size, background: bg }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ? `Photo de ${name}` : 'Photo de profil'}
          onError={() => setImgError(true)}
          className={styles.image}
        />
      ) : (
        <span className={styles.initials} style={{ fontSize }}>
          {initials}
        </span>
      )}

      {editable && (
        <span className={styles.overlay} style={{ fontSize: overlayFontSize }}>
          {editLabel}
        </span>
      )}
    </div>
  )
}
