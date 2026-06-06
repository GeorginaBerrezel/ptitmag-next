'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canAccessCatalog } from '@/lib/members/profile'
import CartIcon from './CartIcon'

export default function MemberCartLink({ locale }: { locale: 'fr' | 'en' }) {
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setHasAccess(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', session.user.id)
        .single()

      setHasAccess(profile ? canAccessCatalog(profile) : false)
    }

    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { check() })
    return () => subscription.unsubscribe()
  }, [])

  if (!hasAccess) return null

  return <CartIcon locale={locale} />
}
