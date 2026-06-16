import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { productMatches } from '@/lib/catalog/search'
import type { Product } from '@/lib/supabase/products'
import { NextResponse, type NextRequest } from 'next/server'

const PAGE = 1000
const SEARCH_LIMIT = 40

const SELECT = `
  id, name, description, category,
  unit, unit_price, min_quantity, allows_partial_order,
  order_deadline, is_featured, supplier_ref,
  supplier:suppliers(id, name, website, type, active, orders_open, order_deadline)
`

/** GET /api/admin/catalogue/search?q=… — recherche catalogue (admin, tous produits actifs). */
export async function GET(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ products: [] })

  const admin = createAdminClient()
  const results: Product[] = []
  let from = 0

  while (results.length < SEARCH_LIMIT) {
    const { data, error } = await admin
      .from('products')
      .select(SELECT)
      .eq('active', true)
      .order('name')
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('[admin/catalogue/search]', error.message)
      break
    }

    const chunk = (data ?? []) as unknown as Product[]
    for (const p of chunk) {
      if (p.supplier?.active === false) continue
      if (productMatches(p, q)) {
        results.push(p)
        if (results.length >= SEARCH_LIMIT) break
      }
    }

    if (chunk.length < PAGE) break
    from += PAGE
  }

  return NextResponse.json({ products: results })
}
