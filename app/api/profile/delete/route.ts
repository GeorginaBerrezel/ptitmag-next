import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/admin/access'
import { NextResponse, type NextRequest } from 'next/server'

const CONFIRMATION = 'SUPPRIMER'

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

  if (confirmation !== CONFIRMATION) {
    return NextResponse.json(
      { error: `Tape « ${CONFIRMATION} » pour confirmer la suppression.` },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // Avatar(s) dans le bucket avatars/{userId}/
  const { data: avatarFiles } = await admin.storage.from('avatars').list(user.id)
  if (avatarFiles?.length) {
    const paths = avatarFiles.map(f => `${user.id}/${f.name}`)
    await admin.storage.from('avatars').remove(paths)
  }

  // Profil public (données personnelles)
  const { error: profileError } = await admin
    .from('profiles')
    .delete()
    .eq('id', user.id)

  if (profileError) {
    console.error('[profile/delete] profiles error:', profileError)
    return NextResponse.json(
      { error: `Impossible de supprimer le profil : ${profileError.message}` },
      { status: 500 },
    )
  }

  const { error: authError } = await admin.auth.admin.deleteUser(user.id)

  if (authError) {
    console.error('[profile/delete] auth error:', authError)
    return NextResponse.json(
      {
        error:
          'Impossible de supprimer le compte. Si vous avez des commandes en cours, contactez-nous à info@leptitmag.org.',
      },
      { status: 500 },
    )
  }

  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
