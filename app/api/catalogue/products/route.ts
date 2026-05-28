import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { getProductsBySupplier } from '@/lib/supabase/catalogue'

/** GET /api/catalogue/products?supplierId=…&category=…&featured=1 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supplierId = request.nextUrl.searchParams.get('supplierId')
  if (!supplierId) {
    return NextResponse.json({ error: 'supplierId requis.' }, { status: 400 })
  }

  const featuredOnly = request.nextUrl.searchParams.get('featured') === '1'
  const category = request.nextUrl.searchParams.get('category')?.trim() || undefined
  const products = await getProductsBySupplier(supplierId, { featuredOnly, category })
  return NextResponse.json(products)
}
