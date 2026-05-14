import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase pour les composants navigateur (Client Components).
 * Utilise les variables publiques NEXT_PUBLIC_* uniquement.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
