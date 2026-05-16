import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase avec la clé service_role.
 * Bypasse toutes les politiques RLS — à utiliser UNIQUEMENT côté serveur
 * dans les routes API admin (jamais dans les composants client).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}
