'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canAccessCatalog } from '@/lib/members/profile'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { CATALOGUE_RESET_EVENT } from '@/lib/catalog/category-nav'

type Props = {
  locale: 'fr' | 'en'
  onNavigate?: () => void
  variant?: 'desktop' | 'mobile'
}

export default function CatalogueNavLink({ locale, onNavigate, variant = 'desktop' }: Props) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)
  const [hasCatalogAccess, setHasCatalogAccess] = useState(false)

  const isActive = pathname === '/commandes' || (
    pathname.startsWith('/commandes/') && !pathname.startsWith('/commandes/partage')
  )

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
      className="nav-catalogue-link"
      onClick={event => {
        if (pathname === '/commandes') {
          event.preventDefault()
          window.dispatchEvent(new Event(CATALOGUE_RESET_EVENT))
        }
        onNavigate?.()
      }}
      aria-current={isActive ? 'page' : undefined}
    >
      {t('catalogue')}
    </Link>
  )

  return <li>{link}</li>
}
