'use client'

import { usePathname } from 'next/navigation'
import { Link } from '@/i18n/navigation'

type NavLink = {
  href: '/admin' | '/admin/commandes' | '/admin/membres' | '/admin/import' | '/admin/guide-import' | '/admin/fournisseurs'
  label: string
  exact: boolean
  badgeKey: 'confirmed' | 'pending' | null
  badgeColor: string
  badgeTitle?: string
}

const NAV_LINKS: NavLink[] = [
  { href: '/admin', label: 'Tableau de bord', exact: true, badgeKey: null, badgeColor: '' },
  {
    href: '/admin/commandes',
    label: 'Commandes',
    exact: false,
    badgeKey: 'confirmed',
    badgeColor: '#DC7F00',
    badgeTitle: 'Commandes confirmées à traiter (livrer ou annuler)',
  },
  {
    href: '/admin/membres',
    label: 'Membres',
    exact: false,
    badgeKey: 'pending',
    badgeColor: '#5c6bc0',
    badgeTitle: 'Inscriptions en attente (statut Non membre)',
  },
  { href: '/admin/fournisseurs', label: 'Fournisseurs', exact: false, badgeKey: null, badgeColor: '' },
  { href: '/admin/import', label: 'Import produits', exact: false, badgeKey: null, badgeColor: '' },
  { href: '/admin/guide-import', label: 'Guide colonnes', exact: false, badgeKey: null, badgeColor: '' },
]

export default function AdminNav({
  locale,
  confirmedCount = 0,
  pendingCount = 0,
}: {
  locale: string
  confirmedCount?: number
  pendingCount?: number
}) {
  const pathname = usePathname()

  function getBadgeCount(key: 'confirmed' | 'pending' | null) {
    if (key === 'confirmed') return confirmedCount
    if (key === 'pending') return pendingCount
    return 0
  }

  return (
    <nav aria-label="Navigation admin" className="admin-nav">
      <span className="admin-nav__brand">⚙ Admin</span>
      <div className="admin-nav__links">
        {NAV_LINKS.map(link => {
          const isActive = link.exact
            ? /\/admin$/.test(pathname)
            : pathname.includes(link.href)
          const badgeCount = getBadgeCount(link.badgeKey)
          const hasBadge = badgeCount > 0

          return (
            <Link
              key={link.href}
              href={link.href}
              locale={locale}
              aria-current={isActive ? 'page' : undefined}
              title={hasBadge && link.badgeTitle ? link.badgeTitle : undefined}
              className={`admin-nav__link${isActive ? ' admin-nav__link--active' : ''}`}
            >
              {link.label}
              {hasBadge && (
                <span
                  className="admin-nav__badge"
                  style={{ background: link.badgeColor }}
                  title={link.badgeTitle}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
              {isActive && !hasBadge && (
                <span className="admin-nav__dot" aria-hidden="true" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
