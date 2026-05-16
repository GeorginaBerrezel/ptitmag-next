'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Link } from '@/i18n/navigation'

// Chaque lien peut avoir un badge optionnel avec sa propre couleur
type NavLink = {
  href: '/admin/commandes' | '/admin/membres' | '/admin/import'
  label: string
  badgeKey: 'confirmed' | 'trial' | null
  badgeColor: string
}

const NAV_LINKS: NavLink[] = [
  { href: '/admin/commandes', label: 'Commandes',     badgeKey: 'confirmed', badgeColor: '#DC7F00' },
  { href: '/admin/membres',   label: 'Membres',       badgeKey: 'trial',     badgeColor: '#5c6bc0' },
  { href: '/admin/import',    label: 'Import produits', badgeKey: null,      badgeColor: '' },
]

export default function AdminNav({
  locale,
  confirmedCount = 0,
  trialCount = 0,
}: {
  locale: string
  confirmedCount?: number
  trialCount?: number
}) {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  function getBadgeCount(key: 'confirmed' | 'trial' | null) {
    if (key === 'confirmed') return confirmedCount
    if (key === 'trial')     return trialCount
    return 0
  }

  return (
    <nav
      aria-label="Navigation admin"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '100%',
        width: '100%',
      }}
    >
      {/* Logo / titre section */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.1rem 0 1.25rem',
        fontWeight: 700,
        fontSize: '0.78rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        opacity: 0.85,
        borderRight: '1px solid rgba(255,255,255,0.1)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        ⚙ Admin
      </span>

      {/* Liens de navigation */}
      {NAV_LINKS.map(link => {
        const isActive    = pathname.includes(link.href)
        const isHovered   = hovered === link.href
        const badgeCount  = getBadgeCount(link.badgeKey)
        const hasBadge    = badgeCount > 0

        return (
          <Link
            key={link.href}
            href={link.href}
            locale={locale}
            onMouseEnter={() => setHovered(link.href)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 1.1rem',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive
                ? '#fff'
                : isHovered
                  ? 'rgba(255,255,255,0.85)'
                  : 'rgba(255,255,255,0.45)',
              borderBottom: isActive
                ? '2px solid #DC7F00'
                : isHovered
                  ? '2px solid rgba(255,255,255,0.2)'
                  : '2px solid transparent',
              background: isHovered && !isActive
                ? 'rgba(255,255,255,0.05)'
                : 'transparent',
              transition: 'color 0.15s, border-color 0.15s, background 0.15s',
              position: 'relative',
              whiteSpace: 'nowrap',
            }}
          >
            {link.label}

            {/* Badge numérique (commandes confirmées, membres en essai) */}
            {hasBadge && (
              <span style={{
                marginLeft: 6,
                background: link.badgeColor,
                color: '#fff',
                borderRadius: 999,
                padding: '0 5px',
                minWidth: 18,
                height: 18,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.68rem',
                fontWeight: 700,
                lineHeight: 1,
              }}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}

            {/* Point discret quand actif sans badge */}
            {isActive && !hasBadge && (
              <span style={{
                position: 'absolute',
                top: 8,
                right: 6,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#DC7F00',
              }} />
            )}
          </Link>
        )
      })}

      {/* Retour au site — aligné à droite */}
      <Link
        href="/mon-compte"
        locale={locale}
        onMouseEnter={() => setHovered('back')}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: 'auto',
          padding: '0 1.25rem',
          textDecoration: 'none',
          fontSize: '0.79rem',
          color: hovered === 'back'
            ? 'rgba(255,255,255,0.75)'
            : 'rgba(255,255,255,0.35)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transition: 'color 0.15s',
          whiteSpace: 'nowrap',
          gap: '0.3rem',
        }}
      >
        ← Retour au site
      </Link>
    </nav>
  )
}
