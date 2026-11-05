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

/**
 * Plus le score est petit, plus le produit est pertinent.
 * null = aucun mot du nom : le mot n’est que dans la description, la catégorie ou la réf.
 * Les mots manquants dans le nom coûtent cher, puis on additionne leur position
 * (« pâtes » en début de nom passe avant « amande … pâtes »).
 */
export function searchNameScore(name: string, query: string): number | null {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0
  const normalizedName = normalizeSearch(name)
  let score = 0
  let hits = 0
  for (const term of terms) {
    const at = normalizedName.indexOf(term)
    if (at < 0) continue
    hits += 1
    score += at
  }
  if (hits === 0) return null
  return (terms.length - hits) * 10_000 + score
}

export function compareSearchRelevance(
  a: { name: string },
  b: { name: string },
  query: string,
): number {
  const rank = (name: string) => searchNameScore(name, query) ?? Number.MAX_SAFE_INTEGER
  const byScore = rank(a.name) - rank(b.name)
  if (byScore !== 0) return byScore
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
}

export function sortBySearchRelevance<T extends { name: string }>(items: T[], query: string): T[] {
  return [...items].sort((a, b) => compareSearchRelevance(a, b, query))
}
