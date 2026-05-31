import type { Product } from '@/lib/supabase/products'

export const PRODUCT_IMAGE_PLACEHOLDER = '/images/product-placeholder.svg'
export const PRODUCT_IMAGES_BUCKET = 'product-images'

/** Chemin Storage : product-images/biopartner/{n° article}.webp */
export function buildBiopartnerImageStoragePath(supplierRef: string): string {
  return `biopartner/${supplierRef.trim()}.webp`
}

export function buildBiopartnerImagePublicUrl(supplierRef: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const ref = supplierRef.trim()
  if (!base || !ref) return null
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${buildBiopartnerImageStoragePath(ref)}`
}

/**
 * URL d'image produit grossiste (Biopartner).
 * Si pas de photo uploadée, le composant affiche le placeholder via onError.
 */
export function getProductImageUrl(product: Product): string | null {
  if (product.supplier?.type !== 'grossiste_bio') return null
  const ref = product.supplier_ref?.trim()
  if (!ref) return PRODUCT_IMAGE_PLACEHOLDER
  return buildBiopartnerImagePublicUrl(ref) ?? PRODUCT_IMAGE_PLACEHOLDER
}

export function showProductImage(product: Product): boolean {
  return product.supplier?.type === 'grossiste_bio'
}

export function isProductImagePlaceholder(url: string): boolean {
  return url === PRODUCT_IMAGE_PLACEHOLDER || url.endsWith(PRODUCT_IMAGE_PLACEHOLDER)
}
