'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canAccessCatalog } from '@/lib/members/profile'
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
  const [hasCatalogAccess, setHasCatalogAccess] = useState(false)

  const isActive = pathname === '/commandes' || pathname.startsWith('/commandes/')

  useEffect(() => {
    const supabase = createClient()

    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setLoggedIn(false)
        setHasCatalogAccess(false)
        return
      }

      setLoggedIn(true)
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', session.user.id)
        .single()

      setHasCatalogAccess(profile ? canAccessCatalog(profile) : false)
    }

    checkAccess()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!loggedIn || !hasCatalogAccess) return null

  const link = (
    <Link
      href="/commandes"
      locale={locale}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
    >
      {t('catalogue')}
    </Link>
  )

  if (variant === 'mobile') {
    return <li>{link}</li>
  }

  return <li>{link}</li>
}
