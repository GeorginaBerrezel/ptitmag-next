import type { Product } from '@/lib/supabase/products'
import { supplierOrdersOpenAt } from '@/lib/catalog/supplier-orders'

/** Peut-on ajouter ce produit au panier ? (dépend du fournisseur, pas du CSV produit). */
export function productOrderableAt(p: Product, nowMs: number): boolean {
  if (!p.supplier) return false
  return supplierOrdersOpenAt(p.supplier, nowMs)
}
