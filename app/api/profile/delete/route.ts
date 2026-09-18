import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/admin/access'
import { DELETE_ACCOUNT_CONFIRMATION, deleteMemberAccount } from '@/lib/members/delete-account'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/profile/delete
 * Supprime le compte de l'utilisateur connecté (auth + profil + avatar).
 * Les commandes passées sont conservées pour l'historique admin (member_id → NULL si migration appliquée).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  if (isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: 'Les comptes administrateurs ne peuvent pas être supprimés depuis ici.' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const confirmation = (body as { confirmation?: string }).confirmation?.trim()

  if (confirmation !== DELETE_ACCOUNT_CONFIRMATION) {
    return NextResponse.json(
      { error: `Tape « ${DELETE_ACCOUNT_CONFIRMATION} » pour confirmer la suppression.` },
      { status: 400 },
    )
  }

  const result = await deleteMemberAccount(createAdminClient(), user.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
