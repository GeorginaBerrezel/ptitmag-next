/** Quantités Bioterroir : pas de 0,25 kg pour les produits au kilo. */

import type { QuantityRules } from '@/lib/catalog/quantity-rules'

export const BIOTERROIR_KG_STEP = 0.25

export function isBioterroirSupplierName(name: string): boolean {
  const key = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]/g, '')
  return key === 'bioterroir' || key.includes('bioterroir')
}

function isKilogramUnit(unit: string | null | undefined): boolean {
  const u = (unit ?? '').trim().toLowerCase()
  return u === 'kg' || u === 'kilo' || u === 'kilogramme'
}

type ProductQuantitySource = {
  min_quantity: number
  allows_partial_order: boolean
  unit: string
  supplier?: { name: string } | null
}

/** Règles effectives catalogue / panier (y compris si la base a encore min_quantity = 1). */
export function resolveQuantityRules(product: ProductQuantitySource): QuantityRules {
  if (product.supplier && isBioterroirSupplierName(product.supplier.name) && isKilogramUnit(product.unit)) {
    return { minQuantity: BIOTERROIR_KG_STEP, allowsPartialOrder: false }
  }
  return {
    minQuantity: product.min_quantity,
    allowsPartialOrder: product.allows_partial_order,
  }
}

export function localImportMinQuantity(supplierName: string, unit: string): number {
  if (isBioterroirSupplierName(supplierName) && isKilogramUnit(unit)) {
    return BIOTERROIR_KG_STEP
  }
  return 1
}
