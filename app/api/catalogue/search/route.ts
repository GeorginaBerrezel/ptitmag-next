import { NextResponse, type NextRequest } from 'next/server'
import { searchCatalogueProducts } from '@/lib/supabase/catalogue'
import { catalogAccessDeniedResponse, getCatalogAccessState } from '@/lib/members/catalog-access'

/** GET /api/catalogue/search?q=…&type=local|grossiste_bio|… */
export async function GET(request: NextRequest) {
  const { user, allowed } = await getCatalogAccessState()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!allowed) return catalogAccessDeniedResponse()

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const supplierId = request.nextUrl.searchParams.get('supplierId') ?? undefined
  const supplierType = request.nextUrl.searchParams.get('type') ?? undefined

  if (!q.trim()) return NextResponse.json([])

  const products = await searchCatalogueProducts(q, { supplierId, supplierType })
  return NextResponse.json(products)
}
