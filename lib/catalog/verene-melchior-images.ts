/** Photos produits Vérène Melchior — fichiers dans /public/images/products/verene-melchior/ */

import { findLocalProducer } from '@/lib/catalog/local-producers'

const VERENE_SLUG = 'verene-melchior'

/** Motifs testés dans le nom produit (insensible à la casse, sans accents). Ordre = du plus spécifique au plus général. */
const NAME_TO_IMAGE: Array<{ pattern: RegExp; imageId: string }> = [
  { pattern: /moelleux.*(pecan|p[eé]can|noix de pecan)/i, imageId: 'moelleux-chocolat-pecan' },
  { pattern: /moelleux.*citron/i, imageId: 'moelleux-citron' },
  { pattern: /moelleux.*chocolat/i, imageId: 'moelleux-chocolat' },
  { pattern: /moelleux/i, imageId: 'moelleux-chocolat' },
  { pattern: /boite.*bois|bo[iî]te.*bois|coffret.*bois/i, imageId: 'truffes-boite-bois' },
  { pattern: /boite.*(24|36)|24.*piece|36.*piece|coffret.*or|boite.*or/i, imageId: 'truffes-boite-or' },
  { pattern: /boite cadeau|cadeau pour/i, imageId: 'truffes-cadeau' },
  { pattern: /enrobage.*cacahou|cacahouete/i, imageId: 'enrobage-cacahouete' },
  { pattern: /enrobage.*sesame/i, imageId: 'enrobage-sesame' },
  { pattern: /enrobage.*coco/i, imageId: 'enrobage-coco' },
  { pattern: /enrobage.*pistache/i, imageId: 'enrobage-pistache' },
  { pattern: /enrobage.*orange/i, imageId: 'enrobage-orange' },
  { pattern: /enrobage.*epice/i, imageId: 'enrobage-epices' },
  { pattern: /enrobage.*noisette/i, imageId: 'enrobage-noisette' },
  { pattern: /enrobage.*citron/i, imageId: 'enrobage-citron' },
  { pattern: /enrobage.*framboise/i, imageId: 'enrobage-framboise' },
  { pattern: /enrobage.*cacao/i, imageId: 'enrobage-cacao' },
  { pattern: /enrobage/i, imageId: 'truffes-assortiment' },
]

const DEFAULT_IMAGE_ID = 'truffes-assortiment'

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
  const imageId = resolveVereneMelchiorImageId(productName) ?? DEFAULT_IMAGE_ID
  return `/images/products/${VERENE_SLUG}/${imageId}.avif`
}
