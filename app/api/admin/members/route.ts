import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Ce fichier gère les membres depuis l'espace admin.
 * Même contrainte que orders : pour lier orders → profiles on doit faire
 * deux requêtes séparées (member_id pointe vers auth.users, pas public.profiles).
 */

const ADMIN_EMAILS = [
  'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
]

const VALID_STATUSES = ['trial', 'member']

// ─── GET /api/admin/members ────────────────────────────────────────────────────
// Retourne tous les profils avec leur historique de commandes agrégé.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Étape 1 : profils + commandes en parallèle
  const [profilesResult, ordersResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, full_name, username, avatar_url, status, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('orders')
      .select('id, member_id, status, total, created_at, supplier:suppliers(name)')
      .order('created_at', { ascending: false }),
  ])

  if (profilesResult.error) {
    console.error('[admin/members GET] profiles error:', profilesResult.error)
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
  }

  // Étape 2 : grouper les commandes par membre
  type RecentOrder = {
    id: string
    status: string
    total: number
    created_at: string
    supplierName: string
  }

  const ordersByMember: Record<string, {
    count: number
    total: number
    lastDate: string | null
    recent: RecentOrder[]
  }> = {}

  for (const order of ordersResult.data ?? []) {
    const mid = order.member_id as string
    if (!ordersByMember[mid]) {
      ordersByMember[mid] = { count: 0, total: 0, lastDate: null, recent: [] }
    }
    if ((order.status as string) !== 'cancelled') {
      ordersByMember[mid].count++
      ordersByMember[mid].total += order.total as number
    }
    const date = order.created_at as string
    if (!ordersByMember[mid].lastDate || date > ordersByMember[mid].lastDate!) {
      ordersByMember[mid].lastDate = date
    }
    if (ordersByMember[mid].recent.length < 5) {
      ordersByMember[mid].recent.push({
        id:           order.id as string,
        status:       order.status as string,
        total:        order.total as number,
        created_at:   date,
        supplierName: (order.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur inconnu',
      })
    }
  }

  // Étape 3 : assembler
  const members = (profilesResult.data ?? []).map(p => ({
    id:            p.id,
    email:         p.email,
    full_name:     p.full_name,
    username:      p.username,
    avatar_url:    p.avatar_url,
    status:        (p.status as string | null) ?? 'trial',
    created_at:    p.created_at,
    orderCount:    ordersByMember[p.id]?.count    ?? 0,
    orderTotal:    ordersByMember[p.id]?.total    ?? 0,
    lastOrderDate: ordersByMember[p.id]?.lastDate ?? null,
    recentOrders:  ordersByMember[p.id]?.recent   ?? [],
  }))

  return NextResponse.json({ members })
}

// ─── PATCH /api/admin/members ──────────────────────────────────────────────────
// Met à jour le statut d'un profil (trial ↔ member).
// Body attendu : { memberId: string, status: 'trial' | 'member' }

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const { memberId, status } = body

  if (!memberId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ status })
    .eq('id', memberId)

  if (error) {
    console.error('[admin/members PATCH] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
