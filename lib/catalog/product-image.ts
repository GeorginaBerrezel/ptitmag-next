import type { Product } from '@/lib/supabase/products'
import {
  buildBrasseriesAyentImagePath,
  isBrasseriesAyentSupplier,
} from '@/lib/catalog/brasseries-ayent-images'
import {
  buildGrainesAvenirImagePath,
  isGrainesAvenirSupplier,
} from '@/lib/catalog/graines-avenir-images'
import {
  buildVereneMelchiorImagePath,
  isVereneMelchiorSupplier,
} from '@/lib/catalog/verene-melchior-images'

export type ProductImagePresentation = {
  objectFit: 'contain' | 'cover'
  objectPosition: string
}

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
 * URL d'image catalogue : Biopartner (Storage), producteurs locaux (assets /public) ou placeholder.
 */
export function getProductImageUrl(product: Product): string | null {
  if (isBrasseriesAyentSupplier(product.supplier?.name)) {
    return buildBrasseriesAyentImagePath(product.name) ?? PRODUCT_IMAGE_PLACEHOLDER
  }
  if (isGrainesAvenirSupplier(product.supplier?.name)) {
    return buildGrainesAvenirImagePath(product.name) ?? PRODUCT_IMAGE_PLACEHOLDER
  }
  if (isVereneMelchiorSupplier(product.supplier?.name)) {
    return buildVereneMelchiorImagePath(product.name) ?? PRODUCT_IMAGE_PLACEHOLDER
  }
  if (product.supplier?.type === 'grossiste_bio') {
    return getBiopartnerProductImageUrl(product)
  }
  return null
}

export function showProductImage(product: Product): boolean {
  if (isBrasseriesAyentSupplier(product.supplier?.name)) return true
  if (isGrainesAvenirSupplier(product.supplier?.name)) return true
  if (isVereneMelchiorSupplier(product.supplier?.name)) return true
  return product.supplier?.type === 'grossiste_bio'
}

export function isProductImagePlaceholder(url: string): boolean {
  return url === PRODUCT_IMAGE_PLACEHOLDER || url.endsWith(PRODUCT_IMAGE_PLACEHOLDER)
}

/** Images statiques /public (Graines d'Avenir, Ayent…) — pas via l'optimiseur Next. */
export function isLocalCatalogImage(url: string): boolean {
  return url.startsWith('/images/products/')
}

/** Photos Biopartner dans Supabase Storage — servies directement (évite l'optimiseur Vercel). */
export function isSupabaseCatalogImage(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`)
}

/** URLs à charger telles quelles dans next/image (pas d'/_next/image sur Vercel). */
export function shouldBypassNextImageOptimizer(url: string): boolean {
  return isLocalCatalogImage(url) || isSupabaseCatalogImage(url)
}

/** Cadrage vignette produit — cover pour Vérène / Graines d'Avenir ; contain pour Biopartner et autres locaux. */
export function getProductImagePresentation(
  product: Product,
  url: string | null,
): ProductImagePresentation {
  if (!url || isProductImagePlaceholder(url)) {
    return { objectFit: 'cover', objectPosition: 'center' }
  }
  if (product.supplier?.type === 'grossiste_bio') {
    return { objectFit: 'contain', objectPosition: 'center' }
  }
  if (isVereneMelchiorSupplier(product.supplier?.name)) {
    return { objectFit: 'cover', objectPosition: 'center' }
  }
  if (isGrainesAvenirSupplier(product.supplier?.name)) {
    return { objectFit: 'cover', objectPosition: 'center' }
  }
  if (isLocalCatalogImage(url)) {
    return { objectFit: 'contain', objectPosition: 'center' }
  }
  return { objectFit: 'cover', objectPosition: 'center' }
}
