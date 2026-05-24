import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin/access'

export async function requireAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return null
  return user
}
