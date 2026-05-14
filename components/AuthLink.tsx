'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/navigation'

export default function AuthLink({ locale }: { locale: 'fr' | 'en' }) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loggedIn) {
    return (
      <Link href="/mon-compte" locale={locale} style={{ fontWeight: 600 }}>
        Mon compte
      </Link>
    )
  }

  return (
    <Link href="/connexion" locale={locale}>
      Connexion
    </Link>
  )
}
