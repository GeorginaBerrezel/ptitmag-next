import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/** Complément membre désactivé (v2.0-c) — ajout produit admin uniquement en « À clôturer ». */
export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  return NextResponse.json(
    { error: 'L\'ajout de produits en ligne n\'est plus disponible. Contactez le magasin.' },
    { status: 403 },
  )
}
