import type { Product } from '@/lib/supabase/products'
import {
  buildBrasseriesAyentImagePath,
  isBrasseriesAyentSupplier,
} from '@/lib/catalog/brasseries-ayent-images'
import {
  buildGrainesAvenirImagePath,
  isGrainesAvenirSupplier,
} from '@/lib/catalog/graines-avenir-images'

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

function getBiopartnerProductImageUrl(product: Product): string | null {
  const ref = product.supplier_ref?.trim()
  if (!ref) return PRODUCT_IMAGE_PLACEHOLDER
  return buildBiopartnerImagePublicUrl(ref) ?? PRODUCT_IMAGE_PLACEHOLDER
}

/**
 * URL d'image catalogue : Biopartner (Storage), Brasseries d'Ayent ou Graines d'Avenir (assets locaux).
 */
export function getProductImageUrl(product: Product): string | null {
  if (isBrasseriesAyentSupplier(product.supplier?.name)) {
    return buildBrasseriesAyentImagePath(product.name) ?? PRODUCT_IMAGE_PLACEHOLDER
  }
  if (isGrainesAvenirSupplier(product.supplier?.name)) {
    return buildGrainesAvenirImagePath(product.name) ?? PRODUCT_IMAGE_PLACEHOLDER
  }
  if (product.supplier?.type === 'grossiste_bio') {
    return getBiopartnerProductImageUrl(product)
  }
  return null
}

export function showProductImage(product: Product): boolean {
  if (isBrasseriesAyentSupplier(product.supplier?.name)) return true
  if (isGrainesAvenirSupplier(product.supplier?.name)) return true
  return product.supplier?.type === 'grossiste_bio'
}

export function isProductImagePlaceholder(url: string): boolean {
  return url === PRODUCT_IMAGE_PLACEHOLDER || url.endsWith(PRODUCT_IMAGE_PLACEHOLDER)
}
