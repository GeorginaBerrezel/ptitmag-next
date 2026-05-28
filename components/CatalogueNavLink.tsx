'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

type Props = {
  locale: 'fr' | 'en'
  onNavigate?: () => void
  /** mobile : lien pleine largeur dans le menu burger */
  variant?: 'desktop' | 'mobile'
}

export default function CatalogueNavLink({ locale, onNavigate, variant = 'desktop' }: Props) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)

  const isActive = pathname === '/commandes' || pathname.startsWith('/commandes/')

  useEffect(() => {
    const supabase = createClient()

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setLoggedIn(!!session?.user)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!loggedIn) return null

  const link = (
    <Link
      href="/commandes"
      locale={locale}
      onClick={onNavigate}
      className="nav-link-catalogue"
      aria-current={isActive ? 'page' : undefined}
    >
      {t('catalogue')}
    </Link>
  )

  if (variant === 'mobile') {
    return <li className="nav-item-catalogue">{link}</li>
  }

  return <li className="nav-item-catalogue">{link}</li>
}
