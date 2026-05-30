'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { useApplyCielMarkup } from '@/lib/members/MemberPricingContext'

export type CartItem = {
  productId: string
  productName: string
  supplierRef: string | null     // numéro article Biopartner (ex: 100040836)
  supplierId: string
  supplierName: string
  supplierType: string
  quantity: number
  unitPrice: number              // prix TTC catalogue, sans majoration
  unit: string
  minQuantity: number            // UC Biopartner : quantité minimum sans majoration
  allowsPartialOrder: boolean    // peut commander < UC avec +10 % (Biopartner)
}

export { getEffectiveUnitPrice }

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const applyCielMarkup = useApplyCielMarkup()
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ptitmag-cart')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('ptitmag-cart', JSON.stringify(items))
  }, [items, hydrated])

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
