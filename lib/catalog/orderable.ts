import type { Product } from '@/lib/supabase/products'

/** Encore commandable à l'instant `nowMs` : pas de deadline ou deadline ≥ now */
export function productOrderableAt(p: Product, nowMs: number): boolean {
  if (!p.order_deadline) return true
  return new Date(p.order_deadline).getTime() >= nowMs
}
