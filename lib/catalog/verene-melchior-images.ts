/** Photos produits Vérène Melchior — fichiers dans /public/images/products/verene-melchior/ */

import { findLocalProducer } from '@/lib/catalog/local-producers'

const VERENE_SLUG = 'verene-melchior'

const NAME_TO_IMAGE: Array<{ pattern: RegExp; imageId: string }> = [
  { pattern: /moelleux.*pecan|moelleux.*p[eé]can/i, imageId: 'moelleux-chocolat-pecan' },
  { pattern: /moelleux.*citron/i, imageId: 'moelleux-chocolat' },
  { pattern: /moelleux.*chocolat/i, imageId: 'moelleux-chocolat' },
  { pattern: /moelleux/i, imageId: 'moelleux-chocolat' },
  { pattern: /truffe.*cadeau|assortiment.*cadeau/i, imageId: 'truffes-cadeau' },
  { pattern: /truffe/i, imageId: 'truffes-assortiment' },
]

export function isVereneMelchiorSupplier(supplierName: string | undefined | null): boolean {
  if (!supplierName) return false
  return findLocalProducer(supplierName)?.slug === VERENE_SLUG
}

export function resolveVereneMelchiorImageId(productName: string): string | null {
  const normalized = productName.normalize('NFD').replace(/\p{M}/gu, '')
  for (const { pattern, imageId } of NAME_TO_IMAGE) {
    if (pattern.test(normalized)) return imageId
  }
  return null
}

export function buildVereneMelchiorImagePath(productName: string): string | null {
  const imageId = resolveVereneMelchiorImageId(productName)
  if (!imageId) return null
  return `/images/products/${VERENE_SLUG}/${imageId}.avif`
}
