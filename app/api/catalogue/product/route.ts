import { NextResponse, type NextRequest } from 'next/server'
import { getCatalogueProductById } from '@/lib/supabase/catalogue'
import { catalogAccessDeniedResponse, getCatalogAccessState } from '@/lib/members/catalog-access'

/** GET /api/catalogue/product?id=… — fiche produit (panier, commandes, bottom sheet). */
export async function GET(request: NextRequest) {
  const { user, allowed } = await getCatalogAccessState()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!allowed) return catalogAccessDeniedResponse()

  const id = request.nextUrl.searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'Paramètre id requis.' }, { status: 400 })

  const product = await getCatalogueProductById(id)
  if (!product) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })

  return NextResponse.json(product)
}
