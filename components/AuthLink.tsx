'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link, usePathname } from '@/i18n/navigation'
import Avatar from './Avatar'

type MiniProfile = {
  id: string
  email?: string | null
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
}

export default function AuthLink({ locale }: { locale: 'fr' | 'en' }) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<MiniProfile | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  const isAccountPage = pathname === '/mon-compte' || pathname.startsWith('/mon-compte/')

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setLoggedIn(false); setProfile(null); return }

      setLoggedIn(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, username, avatar_url')
        .eq('id', session.user.id)
        .single()

      setProfile(data ? { ...data, email: data.email ?? session.user.email } : {
        id: session.user.id,
        email: session.user.email,
      })
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loggedIn && profile) {
    const displayName = profile.username ?? profile.full_name?.split(' ')[0] ?? 'Mon compte'

    return (
      <Link
        href="/mon-compte"
        locale={locale}
        aria-label={`Mon compte — ${displayName}`}
        aria-current={isAccountPage ? 'page' : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          textDecoration: 'none',
          fontWeight: 600,
          color: 'inherit',
          verticalAlign: 'middle',
          lineHeight: 1,
        }}
      >
        <Avatar
          src={profile.avatar_url}
          name={profile.full_name ?? profile.username}
          email={profile.email}
          userId={profile.id}
          size={26}
        />
        <span style={{ verticalAlign: 'middle' }}>{displayName}</span>
      </Link>
    )
  }

  if (loggedIn) {
    return (
      <Link
        href="/mon-compte"
        locale={locale}
        aria-label="Mon compte"
        aria-current={isAccountPage ? 'page' : undefined}
        style={{ fontWeight: 600 }}
      >
        Mon compte
      </Link>
    )
  }

  const isLoginPage = pathname === '/connexion' || pathname.startsWith('/connexion/')

  return (
    <Link
      href="/connexion"
      locale={locale}
      aria-label="Connexion"
      aria-current={isLoginPage ? 'page' : undefined}
    >
      Connexion
    </Link>
  )
}
