import { getSupplierDisplayName } from '@/lib/catalog/supplier-info'
import { getProductImageUrl } from '@/lib/catalog/product-image'
import { getSharePlan } from './eligibility'
import type { Product } from '@/lib/supabase/products'
import type { ShareProduct } from './types'

export function productToShare(
  product: Product,
  minQuantity: number,
): ShareProduct | null {
  if (product.unit_price == null) return null
  const plan = getSharePlan({
    minQuantity,
    unit: product.unit,
    unitPrice: product.unit_price,
  })
  if (!plan) return null
  const supplierName = product.supplier
    ? getSupplierDisplayName(product.supplier.name, product.supplier.type)
    : 'Fournisseur'
  return {
    id: product.id,
    name: product.name,
    supplierName,
    supplierId: product.supplier?.id ?? null,
    supplierType: product.supplier?.type ?? null,
    supplierRef: product.supplier_ref,
    unit: product.unit,
    unitPrice: product.unit_price,
    minQuantity,
    allowsPartialOrder: product.allows_partial_order,
    shareTarget: plan.target,
    shareStep: plan.step,
    imageUrl: getProductImageUrl(product),
  }
}

export function formatShareNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

export function formatShareQty(n: number, unit: string): string {
  return `${formatShareNumber(n)} ${unit}`.trim()
}

/** Une seule fois l’unité, pour ne pas allonger la carte. */
export function formatShareProgress(
  filled: number,
  target: number,
  remaining: number,
  unit: string,
  isFull: boolean,
): string {
  if (isFull) return `Complet : ${formatShareNumber(filled)} ${unit}`
  return `${formatShareNumber(filled)} / ${formatShareNumber(target)} ${unit} · reste ${formatShareNumber(remaining)}`
}

export function formatShareCompact(filled: number, target: number, isFull: boolean): string {
  const pair = `${formatShareNumber(filled)} / ${formatShareNumber(target)}`
  return isFull ? `Complet ${pair}` : pair
}
