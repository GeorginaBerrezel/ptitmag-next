import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/lib/supabase/products'
import { seedWishlistFromOrdersOnce } from '@/lib/wishlist/seed-from-orders'

const PRODUCT_SELECT = `
  id, name, description, category,
  unit, unit_price, min_quantity, allows_partial_order,
  order_deadline, is_featured, supplier_ref,
  supplier:suppliers(id, name, website, type, active, orders_open, order_deadline)
`

export async function getWishlistProductIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  await seedWishlistFromOrdersOnce(supabase, user.id)

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getWishlistProductIds error:', error.message)
    return []
  }

  return (data ?? []).map(row => row.product_id as string)
}

export async function getWishlistProducts(): Promise<Product[]> {
  const ids = await getWishlistProductIds()
  if (ids.length === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .in('id', ids)
    .eq('active', true)

  if (error) {
    console.error('getWishlistProducts error:', error.message)
    return []
  }

  const byId = new Map((data ?? []).map(p => [p.id as string, p as unknown as Product]))
  return ids
    .map(id => byId.get(id))
    .filter((p): p is Product => p != null)
}
