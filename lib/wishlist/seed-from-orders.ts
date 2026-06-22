import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Marque le membre comme « seedé » à la 1ère visite Mes favoris — sans insert en base.
 * Les suggestions « habituels » sont calculées à la volée (voir habitual-from-orders.ts).
 * Les membres déjà seedés avant cette évolution conservent leurs lignes source=seed (migration).
 */
export async function seedWishlistFromOrdersOnce(
  supabase: SupabaseClient,
  memberId: string,
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('wishlist_seeded_at')
    .eq('id', memberId)
    .single()

  if (profile?.wishlist_seeded_at) return

  const { error: markError } = await createAdminClient()
    .from('profiles')
    .update({ wishlist_seeded_at: new Date().toISOString() })
    .eq('id', memberId)

  if (markError) {
    console.error('seedWishlistFromOrders mark seeded:', markError.message)
  }
}
