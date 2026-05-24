import { createClient } from '@/lib/supabase/server'
import type { Product, Supplier } from '@/lib/supabase/products'
import { productMatches } from '@/lib/catalog/search'
import { productOrderableAt } from '@/lib/catalog/orderable'

const PAGE = 1000

const FULL_SELECT = `
  id, name, description, category,
  unit, unit_price, min_quantity, allows_partial_order,
  order_deadline, is_featured, supplier_ref,
  supplier:suppliers(id, name, website, type)
`

const SUMMARY_SELECT = `
  id, category, is_featured, order_deadline,
  supplier:suppliers(id, name, website, type)
`

export type CategorySummary = {
  name: string
  count: number
}

export type CatalogueSupplierSummary = {
  supplier: Supplier
  productCount: number
  categories: CategorySummary[]
  hasFeatured: boolean
  hasOpenOrders: boolean
}

async function paginateSelect<T>(
  run: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await run(from, from + PAGE - 1)
    if (error) {
      console.error('paginateSelect error:', error.message)
      return rows.length ? rows : []
    }
    const chunk = data ?? []
    rows.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }
  return rows
}

/**
 * Index léger du catalogue : compteurs par fournisseur et catégorie.
 * Beaucoup plus rapide que getProducts() pour l'ouverture de la page.
 */
export async function getCatalogueSummaries(): Promise<CatalogueSupplierSummary[]> {
  const supabase = await createClient()
  const nowMs = Date.now()

  type SummaryRow = {
    id: string
    category: string | null
    is_featured: boolean
    order_deadline: string | null
    supplier: Supplier | null
  }

  const rows = await paginateSelect<SummaryRow>(async (from, to) => {
    const { data, error } = await supabase
      .from('products')
      .select(SUMMARY_SELECT)
      .eq('active', true)
      .order('supplier_id')
      .range(from, to)
    return { data: data as SummaryRow[] | null, error }
  })

  const map = new Map<string, {
    supplier: Supplier
    productCount: number
    categoryCounts: Map<string, number>
    hasFeatured: boolean
    hasOpenOrders: boolean
  }>()

  for (const row of rows) {
    if (!row.supplier) continue
    const id = row.supplier.id
    if (!map.has(id)) {
      map.set(id, {
        supplier: row.supplier,
        productCount: 0,
        categoryCounts: new Map(),
        hasFeatured: false,
        hasOpenOrders: false,
      })
    }
    const g = map.get(id)!
    g.productCount++
    const cat = row.category?.trim() || 'Autres'
    g.categoryCounts.set(cat, (g.categoryCounts.get(cat) ?? 0) + 1)
    if (row.is_featured) g.hasFeatured = true
    if (productOrderableAt(row as unknown as Product, nowMs)) g.hasOpenOrders = true
  }

  return Array.from(map.values())
    .map(g => ({
      supplier: g.supplier,
      productCount: g.productCount,
      categories: Array.from(g.categoryCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      hasFeatured: g.hasFeatured,
      hasOpenOrders: g.hasOpenOrders,
    }))
    .sort((a, b) => a.supplier.name.localeCompare(b.supplier.name))
}

/** Produits actifs d'un fournisseur (chargement à la demande). */
export async function getProductsBySupplier(
  supplierId: string,
  options: { featuredOnly?: boolean } = {},
): Promise<Product[]> {
  const supabase = await createClient()

  return paginateSelect<Product>(async (from, to) => {
    let q = supabase
      .from('products')
      .select(FULL_SELECT)
      .eq('active', true)
      .eq('supplier_id', supplierId)
      .order('category')
      .order('name')

    if (options.featuredOnly) q = q.eq('is_featured', true)

    const { data, error } = await q.range(from, to)
    return { data: data as Product[] | null, error }
  })
}

const SEARCH_LIMIT = 100

/** Recherche catalogue côté serveur (accents normalisés, plafonnée). */
export async function searchCatalogueProducts(
  query: string,
  options: { supplierId?: string; supplierType?: string; limit?: number } = {},
): Promise<Product[]> {
  const q = query.trim()
  if (!q) return []

  const supabase = await createClient()
  const limit = options.limit ?? SEARCH_LIMIT
  const results: Product[] = []
  let from = 0

  while (results.length < limit) {
    let qb = supabase
      .from('products')
      .select(FULL_SELECT)
      .eq('active', true)
      .order('name')

    if (options.supplierId) qb = qb.eq('supplier_id', options.supplierId)

    const { data, error } = await qb.range(from, from + PAGE - 1)
    if (error) {
      console.error('searchCatalogueProducts error:', error.message)
      break
    }

    const chunk = (data ?? []) as unknown as Product[]
    for (const p of chunk) {
      if (options.supplierType && p.supplier?.type !== options.supplierType) continue
      if (productMatches(p, q)) {
        results.push(p)
        if (results.length >= limit) break
      }
    }

    if (chunk.length < PAGE) break
    from += PAGE
  }

  return results
}
