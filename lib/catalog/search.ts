import type { Product } from '@/lib/supabase/products'
import { getSupplierDisplayName } from '@/lib/catalog/supplier-info'

/** Minuscules sans accents — « bière » et « biere » deviennent « biere ». */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Chaque mot (séparé par un espace) doit apparaître dans le texte, ordre libre. */
export function matchesSearch(haystack: string, query: string): boolean {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const normalizedHaystack = normalizeSearch(haystack)
  return terms.every(term => normalizedHaystack.includes(term))
}

export function productSearchText(product: Product): string {
  const supplierName = product.supplier?.name
  const supplierLabel = supplierName
    ? getSupplierDisplayName(supplierName, product.supplier?.type)
    : ''
  return [
    product.name,
    product.description,
    product.category,
    product.supplier_ref,
    supplierName,
    supplierLabel !== supplierName ? supplierLabel : '',
  ].filter(Boolean).join(' ')
}

export function productMatches(product: Product, query: string): boolean {
  return matchesSearch(productSearchText(product), query)
}

export function supplierMatches(name: string, query: string, type?: string | null): boolean {
  if (matchesSearch(name, query)) return true
  const label = getSupplierDisplayName(name, type)
  return label !== name && matchesSearch(label, query)
}

export function categoryMatches(name: string, query: string): boolean {
  return matchesSearch(name, query)
}
