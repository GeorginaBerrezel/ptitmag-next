/** Photos bouteilles Brasseries d'Ayent — fichiers dans /public/images/products/brasseries-ayent/ */

const BRASSERIES_SLUG = 'brasseries-ayent'

/** Motifs testés dans le nom produit (insensible à la casse, sans accents). */
const NAME_TO_IMAGE: Array<{ pattern: RegExp; imageId: string }> = [
  { pattern: /cornflex/i, imageId: 'cornflex' },
  { pattern: /effe/i, imageId: 'effe' },
  { pattern: /\bfdn\b|fille du nord/i, imageId: 'fdn' },
  { pattern: /f[eé]e\s*des\s*glaces|feedesglaces/i, imageId: 'fee-des-glaces' },
  { pattern: /folamour/i, imageId: 'folamour' },
  { pattern: /golem/i, imageId: 'golem' },
  { pattern: /matador/i, imageId: 'matador' },
  { pattern: /m[eé]ca\s*bricot|mecabricot/i, imageId: 'mecabricot' },
  { pattern: /normale/i, imageId: 'normale' },
  { pattern: /poison\s*ivy|poisonivy/i, imageId: 'poison-ivy' },
  { pattern: /terre\s*creuse|terrecreuse/i, imageId: 'terre-creuse' },
  { pattern: /thymbr[eé]e|thymbree/i, imageId: 'thymbree' },
  { pattern: /triple/i, imageId: 'triple' },
  { pattern: /\buce\b/i, imageId: 'uce' },
  { pattern: /zombier/i, imageId: 'zombier' },
  { pattern: /zone\s*51|zone51/i, imageId: 'zone51' },
]

export function isBrasseriesAyentSupplier(supplierName: string | undefined | null): boolean {
  if (!supplierName) return false
  const n = supplierName.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  return n.includes('brasseries') && n.includes('ayent')
}

export function resolveBrasseriesAyentImageId(productName: string): string | null {
  const normalized = productName.normalize('NFD').replace(/\p{M}/gu, '')
  for (const { pattern, imageId } of NAME_TO_IMAGE) {
    if (pattern.test(normalized)) return imageId
  }
  return null
}

export function buildBrasseriesAyentImagePath(productName: string): string | null {
  const imageId = resolveBrasseriesAyentImageId(productName)
  if (!imageId) return null
  return `/images/products/${BRASSERIES_SLUG}/${imageId}.avif`
}
