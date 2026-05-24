import type { Product } from '@/lib/supabase/products'

const PLACEHOLDER = '/images/product-placeholder.svg'

/**
 * URL d'image produit. Biopartner / grossistes : placeholder pour l'instant
 * (fichiers réels à brancher plus tard via image_url ou supplier_ref).
 */
export function getProductImageUrl(product: Product): string | null {
  if (product.supplier?.type !== 'grossiste_bio') return null
  // TODO: return product.image_url ?? build path from supplier_ref
  return PLACEHOLDER
}

export function showProductImage(product: Product): boolean {
  return product.supplier?.type === 'grossiste_bio'
}
