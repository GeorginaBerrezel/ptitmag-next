import { NextResponse } from 'next/server'
import { getCatalogueSummaries } from '@/lib/supabase/catalogue'
import { catalogAccessDeniedResponse, getCatalogAccessState } from '@/lib/members/catalog-access'

/** GET /api/catalogue/summary — index fournisseurs (léger). */
export async function GET() {
  const { user, allowed } = await getCatalogAccessState()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!allowed) return catalogAccessDeniedResponse()

  const summaries = await getCatalogueSummaries()
  return NextResponse.json(summaries)
}
