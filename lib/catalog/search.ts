import type { Product } from '@/lib/supabase/products'

/** Minuscules sans accents — « bière » et « biere » deviennent « biere ». */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(haystack: string, query: string): boolean {
  const q = normalizeSearch(query)
  if (!q) return true
  return normalizeSearch(haystack).includes(q)
}

export function productSearchText(product: Product): string {
  return [
    product.name,
    product.description,
    product.category,
    product.supplier_ref,
    product.supplier?.name,
  ].filter(Boolean).join(' ')
}

export function productMatches(product: Product, query: string): boolean {
  return matchesSearch(productSearchText(product), query)
}

export function supplierMatches(name: string, query: string): boolean {
  return matchesSearch(name, query)
}

export function categoryMatches(name: string, query: string): boolean {
  return matchesSearch(name, query)
}
