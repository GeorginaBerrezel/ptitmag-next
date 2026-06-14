/** Photos produits Graines d'Avenir — fichiers dans /public/images/products/graines-avenir/ */

import { findLocalProducer } from '@/lib/catalog/local-producers'

const GRAINES_SLUG = 'graines-avenir'

/** Motifs testés dans le nom produit (insensible à la casse, sans accents). */
const NAME_TO_IMAGE: Array<{ pattern: RegExp; imageId: string }> = [
  { pattern: /amidonnier/i, imageId: 'pain-amidonnier' },
  { pattern: /brioche.*chocolat/i, imageId: 'brioche-fruits' },
  { pattern: /brioche.*fruits/i, imageId: 'brioche-fruits' },
  { pattern: /brioche.*nature/i, imageId: 'brioche-nature' },
  { pattern: /brownies/i, imageId: 'brownies' },
  { pattern: /craquants.*amandes.*chocolat/i, imageId: 'craquants-amandes-chocolat' },
  { pattern: /craquants.*cannelle/i, imageId: 'craquants-cannelle' },
  { pattern: /craquants.*chocolat.*orange|choc.*orange/i, imageId: 'craquants-chocolat-orange' },
  { pattern: /craquants.*gingembre/i, imageId: 'craquants-gingembre' },
  { pattern: /craquants.*noisettes/i, imageId: 'craquants-noisettes' },
  { pattern: /craquants.*pain.*epices|pain.*depices/i, imageId: 'craquants-cannelle' },
  { pattern: /gelee.*gingembre|gelée.*gingembre/i, imageId: 'gelee-gingembre' },
  { pattern: /muffins.*ananas/i, imageId: 'muffins-ananas-chocolat' },
  { pattern: /muffins.*banane/i, imageId: 'muffins-banane-chocolat' },
  { pattern: /muffins.*gingembre/i, imageId: 'muffins-gingembre' },
  { pattern: /pain.*aux.*fruits|pain.*fruits/i, imageId: 'pain-fruits' },
  { pattern: /pain.*engrain|engrain/i, imageId: 'pain-engrain' },
  { pattern: /pain.*epeautre.*graines|epautre.*graines/i, imageId: 'pain-epeautre-graines' },
  { pattern: /pain.*epeautre|epeautre/i, imageId: 'pain-epeautre' },
  { pattern: /pain.*kamut|kamut/i, imageId: 'pain-kamut' },
  { pattern: /pain.*noix|noix.*seigle/i, imageId: 'pain-noix' },
  { pattern: /sable.*avoine.*chocolat|sablé.*avoine/i, imageId: 'sable-avoine-chocolat' },
]

export function isGrainesAvenirSupplier(supplierName: string | undefined | null): boolean {
  if (!supplierName) return false
  return findLocalProducer(supplierName)?.slug === GRAINES_SLUG
}

export function resolveGrainesAvenirImageId(productName: string): string | null {
  const normalized = productName.normalize('NFD').replace(/\p{M}/gu, '')
  for (const { pattern, imageId } of NAME_TO_IMAGE) {
    if (pattern.test(normalized)) return imageId
  }
  return null
}

export function buildGrainesAvenirImagePath(productName: string): string | null {
  const imageId = resolveGrainesAvenirImageId(productName)
  if (!imageId) return null
  return `/images/products/${GRAINES_SLUG}/${imageId}.avif`
}
