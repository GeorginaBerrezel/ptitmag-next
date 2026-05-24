import type { Product } from '@/lib/supabase/products'

export type CategoryGroup = {
  name: string
  items: Product[]
}

/** Regroupe et trie les produits par catégorie (puis par nom). */
export function groupProductsByCategory(items: Product[]): CategoryGroup[] {
  const map = new Map<string, Product[]>()
  for (const p of items) {
    const cat = p.category?.trim() || 'Autres'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(p)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([name, products]) => ({
      name,
      items: products.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
}
