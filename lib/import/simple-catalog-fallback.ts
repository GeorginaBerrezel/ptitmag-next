import { parseGenericCatalogCsv } from '@/lib/import/generic-catalog-csv'
import type { ParsedProduct } from '@/lib/import/local-suppliers'

/** Gabarit simple nom + prix (colonnes flexibles) — secours si le format « Produit » n’est pas trouvé. */
export function tryParseSimpleCatalogGrid(
  grid: string[][],
  defaultCategory: string,
): ParsedProduct[] | null {
  try {
    const products = parseGenericCatalogCsv(grid)
    if (products.length === 0) return null
    return products
      .filter(p => p.unitPrice != null)
      .map(p => ({
        name: p.name,
        category: p.category ?? defaultCategory,
        unit: p.unit,
        unitPrice: p.unitPrice!,
        supplierRef: p.supplierRef ?? undefined,
      }))
  } catch {
    return null
  }
}
