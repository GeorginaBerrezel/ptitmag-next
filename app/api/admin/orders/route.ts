import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { sendDeliveryNotification } from '@/lib/email/sendDeliveryNotification'

const ADMIN_EMAILS = [
  'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
]

const VALID_STATUSES = ['confirmed', 'delivered', 'cancelled']

/**
 * GET /api/admin/orders
 *
 * Pourquoi deux requêtes séparées ?
 * Dans Supabase, orders.member_id pointe vers auth.users (schéma auth interne),
 * pas vers public.profiles. PostgREST ne peut donc pas faire le join automatique
 * entre orders et profiles. On récupère les profils dans une deuxième requête.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // ── Étape 1 : toutes les commandes avec fournisseur + lignes produits ──────
  const { data: orders, error: ordersError } = await admin
    .from('orders')
    .select(`
      id, status, total, created_at, member_id,
      supplier:suppliers(name, type),
      order_items(
        id, quantity, unit_price,
        product:products(name, unit)
      )
    `)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('[admin/orders GET] Supabase error:', ordersError)
    return NextResponse.json({ error: ordersError.message }, { status: 500 })
  }

  // ── Étape 2 : profils des membres concernés ───────────────────────────────
  const memberIds = [
    ...new Set((orders ?? []).map((o: Record<string, unknown>) => o.member_id as string).filter(Boolean)),
  ]

  const profilesMap: Record<string, { full_name: string | null; email: string | null; username: string | null }> = {}

  if (memberIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, full_name, email, username')
      .in('id', memberIds)

    if (profilesError) {
      console.error('[admin/orders GET] profiles error:', profilesError)
    }

    for (const p of profiles ?? []) {
      profilesMap[(p as { id: string }).id] = {
        full_name: (p as { full_name: string | null }).full_name,
        email:     (p as { email: string | null }).email,
        username:  (p as { username: string | null }).username,
      }
    }
  }

  // ── Étape 3 : assembler et renvoyer ──────────────────────────────────────
  const result = (orders ?? []).map((order: Record<string, unknown>) => ({
    id:          order.id,
    status:      order.status,
    total:       order.total,
    created_at:  order.created_at,
    supplier:    order.supplier,
    order_items: order.order_items,
    member:      profilesMap[order.member_id as string] ?? null,
  }))

  return NextResponse.json({ orders: result })
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
    console.error('[admin/orders PATCH] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Email automatique quand l'admin marque une commande comme livrée ─────
  if (status === 'delivered') {
    try {
      // Récupérer les détails de la commande (fournisseur + produits)
      const { data: order } = await admin
        .from('orders')
        .select(`
          total, member_id,
          supplier:suppliers(name),
          order_items(
            quantity, unit_price,
            product:products(name, unit)
          )
        `)
        .eq('id', orderId)
        .single()

      if (order) {
        // Récupérer le profil du membre (email + nom)
        const { data: profile } = await admin
          .from('profiles')
          .select('email, full_name, username')
          .eq('id', order.member_id)
          .single()

        if (profile?.email) {
          const memberName = (profile.full_name as string | null) || (profile.username as string | null) || null
          const supplierName = (order.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur'
          const items = (order.order_items as unknown as Array<{
            quantity: number
            unit_price: number
            product: { name: string; unit: string } | null
          }>).map(item => ({
            productName: item.product?.name ?? '—',
            quantity:    item.quantity,
            unit:        item.product?.unit ?? '',
            unitPrice:   item.unit_price,
          }))

          await sendDeliveryNotification({
            memberEmail: profile.email as string,
            memberName,
            supplierName,
            items,
            total: order.total as number,
          })
        }
      }
    } catch (err) {
      // L'email échoue silencieusement — la mise à jour du statut reste valide
      console.error('[admin/orders PATCH] Delivery notification failed:', err)
    }
  }

  return NextResponse.json({ success: true })
}
