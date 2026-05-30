'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Supabase renvoie parfois #access_token=… sur la page d'accueil (lien non whitelisté).
 * On établit la session, nettoie l'URL et redirige vers Mon compte ou Connexion.
 */
export default function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('access_token=')) return

    const supabase = createClient()
    const locale = window.location.pathname.match(/^\/(fr|en)(\/|$)/)?.[1] ?? 'fr'
    const cleanPath = window.location.pathname + window.location.search

    void supabase.auth.getSession().then(({ data: { session } }) => {
      window.history.replaceState(null, '', cleanPath || `/${locale}`)
      const target = session
        ? `/${locale}/mon-compte?compte_confirme=1`
        : `/${locale}/connexion?compte_confirme=1`
      window.location.replace(target)
    })
  }, [])

  return null
}
