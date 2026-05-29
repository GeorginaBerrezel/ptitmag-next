'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isCotiseProfile } from '@/lib/members/profile'

type MemberPricingContextType = {
  isCotise: boolean
}

const MemberPricingContext = createContext<MemberPricingContextType>({
  isCotise: true,
})

/**
 * Statut cotisation pour les prix (+20 % si non cotisé).
 * Valeur initiale du serveur + resync client (session Supabase) pour éviter
 * un layout figé après connexion / navigation client.
 */
export function MemberPricingProvider({
  isCotise: initialIsCotise,
  children,
}: {
  isCotise: boolean
  children: React.ReactNode
}) {
  const [isCotise, setIsCotise] = useState(initialIsCotise)

  useEffect(() => {
    setIsCotise(initialIsCotise)
  }, [initialIsCotise])

  useEffect(() => {
    const supabase = createClient()

    async function syncFromSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsCotise(true)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, cotisation_amount, cotisation_active')
        .eq('id', user.id)
        .single()

      setIsCotise(profile ? isCotiseProfile(profile) : true)
    }

    syncFromSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      syncFromSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <MemberPricingContext.Provider value={{ isCotise }}>
      {children}
    </MemberPricingContext.Provider>
  )
}

export function useMemberPricing() {
  return useContext(MemberPricingContext)
}

/** true si le membre non cotisé paie +20 % sur le catalogue. */
export function useApplyTrialMarkup(): boolean {
  const { isCotise } = useMemberPricing()
  return !isCotise
}
