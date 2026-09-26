'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isShareEnabled, SHARE_MESSAGES } from './eligibility'
import { isPoolFull, poolFilled, poolRemaining, shareTargetOf } from './pool-math'
import type { ShareActionResult, ShareIfIncomplete, SharePoolView, ShareProduct } from './types'

const POLL_MS = 20_000

type SharingContextType = {
  enabled: boolean
  viewerId: string | null
  pools: SharePoolView[]
  openPools: SharePoolView[]
  readyPools: SharePoolView[]
  loading: boolean
  startOrJoin: (product: ShareProduct, quantity: number, ifIncomplete?: ShareIfIncomplete, coverMax?: number | null) => Promise<ShareActionResult>
  removeYours: (poolId: string) => Promise<ShareActionResult>
  setIfIncomplete: (poolId: string, ifIncomplete: ShareIfIncomplete) => Promise<void>
  refresh: () => Promise<void>
}

const SharingContext = createContext<SharingContextType | null>(null)

function withTotals(pools: SharePoolView[]): SharePoolView[] {
  return pools.map(pool => {
    const target = shareTargetOf(pool.product)
    const filled = poolFilled(pool.contributions)
    return {
      ...pool,
      filled,
      remaining: poolRemaining(target, filled),
      isFull: isPoolFull(target, filled) || pool.isFull,
    }
  })
}

async function readJson(res: Response): Promise<{ pools?: SharePoolView[]; error?: string; notice?: string; viewerId?: string }> {
  try {
    return await res.json()
  } catch {
    return { error: 'Réponse invalide.' }
  }
}

export function SharingProvider({
  children,
  enabled = false,
  viewerId = null,
}: {
  children: ReactNode
  enabled?: boolean
  viewerId?: string | null
  /** @deprecated plus utilisé */
  viewerIsAdmin?: boolean
}) {
  const [pools, setPools] = useState<SharePoolView[]>([])
  const [loading, setLoading] = useState(false)
  const shareOn = enabled && isShareEnabled()
  const inFlight = useRef(false)

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!shareOn) {
      setPools([])
      return
    }
    if (inFlight.current) return
    inFlight.current = true
    const silent = opts?.silent === true
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/sharing/pools')
      const data = await readJson(res)
      if (res.ok && Array.isArray(data.pools)) setPools(withTotals(data.pools))
    } finally {
      inFlight.current = false
      if (!silent) setLoading(false)
    }
  }, [shareOn])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!shareOn) return

    function onVisibility() {
      if (document.visibilityState === 'visible') void refresh({ silent: true })
    }

    document.addEventListener('visibilitychange', onVisibility)
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh({ silent: true })
    }, POLL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(id)
    }
  }, [shareOn, refresh])

  const startOrJoin = useCallback(async (
    product: ShareProduct,
    quantity: number,
    ifIncomplete: ShareIfIncomplete = 'rollover',
    coverMax?: number | null,
  ): Promise<ShareActionResult> => {
    if (!shareOn) return { error: 'Partages désactivés.' }
    const body: { productId: string; quantity: number; ifIncomplete: ShareIfIncomplete; coverMax?: number | null } = {
      productId: product.id,
      quantity,
      ifIncomplete,
    }
    if (coverMax !== undefined) body.coverMax = coverMax
    const res = await fetch('/api/sharing/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await readJson(res)
    if (Array.isArray(data.pools)) setPools(withTotals(data.pools))
    if (!res.ok) return { error: data.error ?? SHARE_MESSAGES.unavailable }
    return { notice: data.notice }
  }, [shareOn])

  const removeYours = useCallback(async (poolId: string): Promise<ShareActionResult> => {
    const res = await fetch('/api/sharing/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolId }),
    })
    const data = await readJson(res)
    if (!res.ok) return { error: data.error ?? SHARE_MESSAGES.unavailable }
    if (Array.isArray(data.pools)) setPools(withTotals(data.pools))
    return { notice: data.notice ?? SHARE_MESSAGES.withdrawn }
  }, [])

  const setIfIncomplete = useCallback(async (poolId: string, ifIncomplete: ShareIfIncomplete) => {
    const res = await fetch('/api/sharing/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolId, ifIncomplete }),
    })
    const data = await readJson(res)
    if (res.ok && Array.isArray(data.pools)) setPools(withTotals(data.pools))
  }, [])

  const views = useMemo(() => withTotals(pools), [pools])

  return (
    <SharingContext.Provider
      value={{
        enabled: shareOn,
        viewerId,
        pools: views,
        openPools: views.filter(p => !p.isFull),
        readyPools: views.filter(p => p.isFull),
        loading,
        startOrJoin,
        removeYours,
        setIfIncomplete,
        refresh,
      }}
    >
      {children}
    </SharingContext.Provider>
  )
}

export function useSharing() {
  const ctx = useContext(SharingContext)
  if (!ctx) throw new Error('useSharing must be used within SharingProvider')
  return ctx
}

export function useSharingOptional() {
  return useContext(SharingContext)
}

/** Visible pour tout membre catalogue, si le partage est allumé. */
export function useSharePrototypeVisible(): boolean {
  const ctx = useContext(SharingContext)
  return Boolean(ctx?.enabled)
}

export const useShareVisible = useSharePrototypeVisible
