'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applyCielMarkup } from '@/lib/members/profile'

type MemberPricingContextType = {
  /** true = membre Ciel → +20 % sur le catalogue */
  applyCielMarkup: boolean
}

const MemberPricingContext = createContext<MemberPricingContextType>({
  applyCielMarkup: false,
})

/**
 * Tarification selon statut : Ciel (+20 %) · Terre (prix juste).
 * Valeur initiale serveur + resync client après connexion.
 */
export function MemberPricingProvider({
  applyCielMarkup: initialApplyCielMarkup,
  children,
}: {
  applyCielMarkup: boolean
  children: React.ReactNode
}) {
  const [markup, setMarkup] = useState(initialApplyCielMarkup)

  useEffect(() => {
    setMarkup(initialApplyCielMarkup)
  }, [initialApplyCielMarkup])

  useEffect(() => {
    const supabase = createClient()

    async function syncFromSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMarkup(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, cotisation_amount, cotisation_active')
        .eq('id', user.id)
        .single()

      setMarkup(profile ? applyCielMarkup(profile) : false)
    }

    syncFromSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      syncFromSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <MemberPricingContext.Provider value={{ applyCielMarkup: markup }}>
      {children}
    </MemberPricingContext.Provider>
  )
}

export function useMemberPricing() {
  return useContext(MemberPricingContext)
}

/** true si membre Ciel → +20 % sur les prix catalogue. */
export function useApplyCielMarkup(): boolean {
  return useContext(MemberPricingContext).applyCielMarkup
}

/** @deprecated Préférer useApplyCielMarkup */
export function useApplyTrialMarkup(): boolean {
  return useApplyCielMarkup()
}
