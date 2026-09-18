'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'
import { parseCartItems } from './parse-items'
import type { CartItem } from './types'

export type { CartItem }
export { getEffectiveUnitPrice }

const STORAGE_KEY = 'ptitmag-cart'
const POLL_MS = 20_000
const SAVE_MS = 500

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  totalItems: number
  globalTotal: number
}

const CartContext = createContext<CartContextType | null>(null)

function readLocal(): CartItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    return parseCartItems(JSON.parse(saved))
  } catch {
    return []
  }
}

export function CartProvider({
  children,
  memberId = null,
}: {
  children: React.ReactNode
  memberId?: string | null
}) {
  const applyCielMarkup = useApplyCielMarkup()
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const dirty = useRef(false)
  const skipNextSave = useRef(false)
  const readyForSync = useRef(false)
  const inFlight = useRef(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    setItems(readLocal())
    setHydrated(true)
  }, [])

  const pull = useCallback(async () => {
    if (!memberId || inFlight.current) return
    inFlight.current = true
    try {
      const res = await fetch('/api/cart')
      const data = await res.json().catch(() => ({})) as { items?: unknown; exists?: boolean }
      if (!res.ok) return
      if (dirty.current) return
      if (data.exists) {
        skipNextSave.current = true
        setItems(parseCartItems(data.items))
      } else if (itemsRef.current.length > 0) {
        const put = await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsRef.current }),
        })
        if (put.ok) dirty.current = false
      }
      readyForSync.current = true
    } finally {
      inFlight.current = false
    }
  }, [memberId])

  useEffect(() => {
    if (!hydrated) return
    if (!memberId) {
      readyForSync.current = false
      return
    }
    void pull()
  }, [hydrated, memberId, pull])

  useEffect(() => {
    if (!hydrated || !memberId) return

    function onVisibility() {
      if (document.visibilityState === 'visible') void pull()
    }

    document.addEventListener('visibilitychange', onVisibility)
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull()
    }, POLL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(id)
    }
  }, [hydrated, memberId, pull])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    if (!memberId || !readyForSync.current) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    dirty.current = true
    const t = window.setTimeout(() => {
      void (async () => {
        const res = await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsRef.current }),
        })
        if (res.ok) dirty.current = false
      })()
    }, SAVE_MS)
    return () => window.clearTimeout(t)
  }, [items, hydrated, memberId])

  function addItem(newItem: CartItem) {
    setItems(prev => {
      const existing = prev.find(i => i.productId === newItem.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === newItem.productId ? { ...i, ...newItem } : i
        )
      }
      return [...prev, newItem]
    })
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems(prev =>
      prev.map(i => (i.productId === productId ? { ...i, quantity } : i))
    )
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = items.length
  const globalTotal = items.reduce(
    (sum, i) => sum + i.quantity * getEffectiveUnitPrice(i, { applyCielMarkup }),
    0,
  )

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, totalItems, globalTotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé dans un CartProvider')
  return ctx
}
