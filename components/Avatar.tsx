'use client'

import { useState } from 'react'

// Palette de couleurs chaleureuses — une couleur unique par utilisateur
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
  editable?: boolean
}

export default function Avatar({
  src,
  name,
  email,
  userId,
  size = 40,
  onClick,
  editable = false,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const initials = getInitials(name, email)
  const bg = getColor(userId ?? email ?? name ?? '?')
  const fontSize = Math.round(size * 0.38)
  const showImage = src && !imgError

  return (
    <div
      onClick={onClick}
      title={name ?? email ?? undefined}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        background: bg,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ?? 'avatar'}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{
          color: '#fff',
          fontSize,
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {initials}
        </span>
      )}

      {/* Overlay "modifier" au survol */}
      {editable && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: Math.round(size * 0.22),
          fontWeight: 600,
          opacity: 0,
          transition: 'opacity 0.2s',
          borderRadius: '50%',
        }}
          className="avatar-overlay"
        >
          ✎
        </div>
      )}
      {editable && (
        <style>{`.avatar-overlay { opacity: 0 } div:hover > .avatar-overlay { opacity: 1 }`}</style>
      )}
    </div>
  )
}
