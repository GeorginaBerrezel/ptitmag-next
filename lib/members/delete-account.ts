import type { SupabaseClient } from '@supabase/supabase-js'

export const DELETE_ACCOUNT_CONFIRMATION = 'SUPPRIMER'

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Efface avatar, profil public et compte Auth.
 * Les commandes restent (member_id → NULL). À n’appeler qu’avec le client service_role.
 */
export async function deleteMemberAccount(
  admin: SupabaseClient,
  userId: string,
): Promise<DeleteAccountResult> {
  const { data: avatarFiles } = await admin.storage.from('avatars').list(userId)
  if (avatarFiles?.length) {
    const paths = avatarFiles.map(f => `${userId}/${f.name}`)
    await admin.storage.from('avatars').remove(paths)
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)

  if (profileError) {
    console.error('[delete-account] profiles error:', profileError)
    return {
      ok: false,
      message: `Impossible de supprimer le profil : ${profileError.message}`,
    }
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId)

  if (authError) {
    console.error('[delete-account] auth error:', authError)
    return {
      ok: false,
      message:
        'Impossible de supprimer le compte. Si le membre a des commandes en cours, contacte-nous à info@leptitmag.org.',
    }
  }

  return { ok: true }
}
