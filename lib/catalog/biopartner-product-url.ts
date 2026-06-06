import { isBiopartnerSupplierName } from '@/lib/import/biopartner-catalogs'

const BIOPARTNER_SHOP_ORIGIN = 'https://shop.biopartner.ch'

/**
 * Fiche produit publique Biopartner (ingrédients, allergènes, nutrition…).
 * Le n° d'article seul suffit : /fr/products/500600396
 */
export function buildBiopartnerShopProductUrl(supplierRef: string): string | null {
  const ref = supplierRef.trim()
  if (!ref || !/^\d+$/.test(ref)) return null
  return `${BIOPARTNER_SHOP_ORIGIN}/fr/products/${ref}`
}

export function getBiopartnerProductInfoUrl(
  product: { supplier_ref?: string | null; supplier?: { name?: string } | null },
): string | null {
  if (!isBiopartnerSupplierName(product.supplier?.name ?? '')) return null
  if (!product.supplier_ref?.trim()) return null
  return buildBiopartnerShopProductUrl(product.supplier_ref)
}
