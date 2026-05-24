import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCatalogueSummaries } from '@/lib/supabase/catalogue'

/** GET /api/catalogue/summary — index fournisseurs (léger). */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const summaries = await getCatalogueSummaries()
  return NextResponse.json(summaries)
}
