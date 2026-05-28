'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

type Props = {
  locale: 'fr' | 'en'
  onNavigate?: () => void
}

export default function CatalogueNavLink({ locale, onNavigate }: Props) {
  const t = useTranslations('nav')
  const [loggedIn, setLoggedIn] = useState(false)

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

  return (
    <li>
      <Link href="/commandes" locale={locale} onClick={onNavigate}>
        {t('catalogue')}
      </Link>
    </li>
  )
}
