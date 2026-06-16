import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'
import { countEligibleForArchive } from '@/lib/admin/order-archive'
import { roundChf } from '@/lib/members/credit'

const VALID_STATUSES = ['confirmed', 'delivered', 'cancelled']

/**
 * GET /api/admin/orders
 *
 * Pourquoi deux requêtes séparées ?
 * Dans Supabase, orders.member_id pointe vers auth.users (schéma auth interne),
 * pas vers public.profiles. PostgREST ne peut donc pas faire le join automatique
 * entre orders et profiles. On récupère les profils dans une deuxième requête.
 */
export async function GET(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const includeArchived = request.nextUrl.searchParams.get('includeArchived') === '1'
  const admin = createAdminClient()

  // ── Étape 1 : toutes les commandes (pagination : PostgREST limite à 1000 lignes par défaut)
  const PAGE = 1000
  const selectPayload = `
      id, status, total, credit_applied, created_at, archived_at, closed_at, member_id,
      supplier:suppliers(name, type),
      order_items(
        id, quantity, unit_price, cancelled_at,
        product:products(name, unit, supplier_ref)
      )
    `

  const orders: Record<string, unknown>[] = []
  let from = 0
  for (;;) {
    let query = admin
      .from('orders')
      .select(selectPayload)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)

    if (!includeArchived) {
      query = query.is('archived_at', null)
    }

    const { data: batch, error: ordersError } = await query

    if (ordersError) {
      console.error('[admin/orders GET] Supabase error:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    const chunk = batch ?? []
    orders.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }

  // ── Étape 2 : profils des membres concernés ───────────────────────────────
  const memberIds = [
    ...new Set(orders.map((o: Record<string, unknown>) => o.member_id as string).filter(Boolean)),
  ]

  const profilesMap: Record<string, {
    full_name: string | null
    email: string | null
    username: string | null
    credit_balance: number
  }> = {}

  if (memberIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, full_name, email, username, credit_balance')
      .in('id', memberIds)

    if (profilesError) {
      console.error('[admin/orders GET] profiles error:', profilesError)
    }

    for (const p of profiles ?? []) {
      profilesMap[(p as { id: string }).id] = {
        full_name: (p as { full_name: string | null }).full_name,
        email:     (p as { email: string | null }).email,
        username:  (p as { username: string | null }).username,
        credit_balance: roundChf(Number((p as { credit_balance: number | null }).credit_balance) || 0),
      }
    }
  }

  // ── Étape 3 : assembler et renvoyer ──────────────────────────────────────
  const result = orders.map((order: Record<string, unknown>) => {
    const rawItems = (order.order_items as Array<{ cancelled_at?: string | null }> | null) ?? []
    const activeItems = rawItems.filter(i => !i.cancelled_at)

    return {
      id: order.id,
      member_id: order.member_id,
      status: order.status,
      total: order.total,
      credit_applied: order.credit_applied ?? 0,
      created_at: order.created_at,
      closed_at: order.closed_at ?? null,
      archived_at: order.archived_at ?? null,
      supplier: order.supplier,
      order_items: activeItems,
      member: profilesMap[order.member_id as string] ?? null,
    }
  })

  const archivableCount = countEligibleForArchive(
    result.map(o => ({
      status: o.status as string,
      created_at: o.created_at as string,
      archived_at: o.archived_at as string | null,
    })),
  )

  return NextResponse.json({ orders: result, archivableCount })
}

/**
 * PATCH /api/admin/orders
 * Met à jour le statut d'une commande.
 * Body attendu : { orderId: string, status: 'confirmed' | 'delivered' | 'cancelled' }
 */
export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const { orderId, status } = body

  if (!orderId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existingOrder, error: fetchErr } = await admin
    .from('orders')
    .select('id, status, member_id, credit_applied')
    .eq('id', orderId)
    .single()

  if (fetchErr || !existingOrder) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  const previousStatus = existingOrder.status as string
  const creditApplied = roundChf(Number(existingOrder.credit_applied) || 0)

  const { error } = await admin
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) {
    console.error('[admin/orders PATCH] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (
    status === 'cancelled' &&
    previousStatus !== 'cancelled' &&
    creditApplied > 0 &&
    existingOrder.member_id
  ) {
    const { data: profile } = await admin
      .from('profiles')
      .select('credit_balance')
      .eq('id', existingOrder.member_id as string)
      .single()

    if (profile) {
      const restored = roundChf((Number(profile.credit_balance) || 0) + creditApplied)
      await admin
        .from('profiles')
        .update({ credit_balance: restored })
        .eq('id', existingOrder.member_id as string)
    }
  }

  // v2.0-a : pas d'email automatique par fournisseur — utiliser notify-delivery par membre.

  return NextResponse.json({ success: true })
}
