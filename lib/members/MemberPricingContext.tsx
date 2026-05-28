'use client'

import { createContext, useContext } from 'react'

type MemberPricingContextType = {
  isCotise: boolean
}

const MemberPricingContext = createContext<MemberPricingContextType>({
  isCotise: true,
})

export function MemberPricingProvider({
  isCotise,
  children,
}: {
  isCotise: boolean
  children: React.ReactNode
}) {
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
