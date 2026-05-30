import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canAccessCatalog, type ProfileCotisation } from '@/lib/members/profile'

export async function getCatalogAccessState() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null, allowed: false }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status, cotisation_amount, cotisation_active')
    .eq('id', user.id)
    .single()

  const p = profile as ProfileCotisation | null

  return {
    user,
    profile: p,
    allowed: p ? canAccessCatalog(p) : false,
  }
}

export function catalogAccessDeniedResponse() {
  return NextResponse.json(
    { error: 'Accès catalogue réservé aux membres validés par Joel.' },
    { status: 403 },
  )
}
