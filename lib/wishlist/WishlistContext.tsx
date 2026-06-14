'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canAccessCatalog } from '@/lib/members/profile'

type WishlistContextType = {
  enabled: boolean
  ready: boolean
  productIds: Set<string>
  count: number
  isFavorited: (productId: string) => boolean
  toggle: (productId: string) => Promise<boolean>
  togglingId: string | null
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [productIds, setProductIds] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadWishlist = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      setEnabled(false)
      setProductIds(new Set())
      setReady(true)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', session.user.id)
      .single()

    if (!profile || !canAccessCatalog(profile)) {
      setEnabled(false)
      setProductIds(new Set())
      setReady(true)
      return
    }

    setEnabled(true)

    try {
      const res = await fetch('/api/member/wishlist')
      if (!res.ok) {
        setProductIds(new Set())
        return
      }
      const data = await res.json() as { productIds?: string[] }
      setProductIds(new Set(data.productIds ?? []))
    } catch {
      setProductIds(new Set())
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void loadWishlist()
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setReady(false)
      void loadWishlist()
    })
    return () => subscription.unsubscribe()
  }, [loadWishlist])

  const toggle = useCallback(async (productId: string) => {
    if (!enabled) return false

    const wasFavorited = productIds.has(productId)
    setTogglingId(productId)
    setProductIds(prev => {
      const next = new Set(prev)
      if (wasFavorited) next.delete(productId)
      else next.add(productId)
      return next
    })

    try {
      const res = await fetch('/api/member/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur favori')

      const favorited = Boolean(data.favorited)
      setProductIds(prev => {
        const next = new Set(prev)
        if (favorited) next.add(productId)
        else next.delete(productId)
        return next
      })
      return favorited
    } catch {
      setProductIds(prev => {
        const next = new Set(prev)
        if (wasFavorited) next.add(productId)
        else next.delete(productId)
        return next
      })
      return wasFavorited
    } finally {
      setTogglingId(null)
    }
  }, [enabled, productIds])

  const value = useMemo<WishlistContextType>(() => ({
    enabled,
    ready,
    productIds,
    count: productIds.size,
    isFavorited: (productId: string) => productIds.has(productId),
    toggle,
    togglingId,
  }), [enabled, ready, productIds, toggle, togglingId])

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist doit être utilisé dans un WishlistProvider')
  return ctx
}
