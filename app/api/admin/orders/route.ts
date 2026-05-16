import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = [
  'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
]

const VALID_STATUSES = ['confirmed', 'delivered', 'cancelled']

/**
 * GET /api/admin/orders
 * Retourne toutes les commandes avec le nom du membre, le fournisseur et les produits.
 * Accessible uniquement aux admins.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('orders')
    .select(`
      id, status, total, created_at,
      member:profiles!member_id(full_name, email, username),
      supplier:suppliers!supplier_id(name, type),
      order_items(
        id, quantity, unit_price,
        product:products!product_id(name, unit)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders: data ?? [] })
}

/**
 * PATCH /api/admin/orders
 * Met à jour le statut d'une commande.
 * Body attendu : { orderId: string, status: 'confirmed' | 'delivered' | 'cancelled' }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const { orderId, status } = body

  if (!orderId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
