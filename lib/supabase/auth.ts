import { createClient } from '@/lib/supabase/server'

/**
 * Retourne l'utilisateur connecté côté serveur, ou null.
 * À utiliser dans les Server Components et layouts protégés.
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Retourne le profil complet de l'utilisateur connecté (table profiles).
 */
export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
