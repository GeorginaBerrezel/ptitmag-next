import { createClient } from '@/lib/supabase/server'

/**
 * Retourne l'utilisateur connecté côté serveur, ou null.
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Retourne le profil complet de l'utilisateur connecté.
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

export type OrderWithItems = {
  id: string
  status: string
  total: number
  created_at: string
  supplier: { name: string; type: string } | null
  order_items: {
    id: string
    quantity: number
    unit_price: number
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
      id, status, total, created_at,
      supplier:suppliers(name, type),
      order_items(
        id, quantity, unit_price,
        product:products(name, unit)
      )
    `)
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyOrders error:', error.message)
    return []
  }

  return (data ?? []) as unknown as OrderWithItems[]
}
