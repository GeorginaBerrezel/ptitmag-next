import { createClient } from '@/lib/supabase/server'

/**
 * Retourne l'utilisateur connecté côté serveur, ou null.
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export type Profile = {
  id: string
  email?: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  postal_code?: string | null
  commune?: string | null
  username?: string | null
  avatar_url?: string | null
  status?: string | null
  cotisation_amount?: number | null
  cotisation_active?: boolean | null
  credit_balance?: number | null
}

/**
 * Retourne le profil complet de l'utilisateur connecté.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name, last_name, phone, postal_code, commune, username, avatar_url, status, cotisation_amount, cotisation_active, credit_balance')
    .eq('id', user.id)
    .single()

  return profile as Profile | null
}

export type OrderWithItems = {
  id: string
  status: string
  total: number
  credit_applied?: number
  created_at: string
  supplier: { name: string; type: string } | null
  order_items: {
    id: string
    quantity: number
    unit_price: number
    cancelled_at?: string | null
    product: { name: string; unit: string } | null
  }[]
}

/**
 * Retourne l'historique des commandes de l'utilisateur connecté.
 */
export async function getMyOrders(): Promise<OrderWithItems[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, total, credit_applied, created_at,
      supplier:suppliers(name, type),
      order_items(
        id, quantity, unit_price, cancelled_at,
        product:products(name, unit)
      )
    `)
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyOrders error:', error.message)
    return []
  }

  return (data ?? []).map(order => {
    const raw = order as unknown as OrderWithItems
    return {
      ...raw,
      order_items: raw.order_items.filter(i => !i.cancelled_at),
    }
  })
}
