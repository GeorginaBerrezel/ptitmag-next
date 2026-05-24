import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'

const VALID_STATUSES = ['trial', 'member']

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
  status: string | null
  created_at: string | null
  cotisation_amount: number | null
  cotisation_active: boolean | null
}

const PROFILE_SELECT = 'id, email, full_name, username, avatar_url, status, created_at, cotisation_amount, cotisation_active'

export async function GET() {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const [profilesResult, ordersResult] = await Promise.all([
    admin.from('profiles').select(PROFILE_SELECT).order('created_at', { ascending: false }),
    admin
      .from('orders')
      .select('id, member_id, status, total, created_at, supplier:suppliers(name)')
      .order('created_at', { ascending: false }),
  ])

  if (profilesResult.error) {
    console.error('[admin/members GET] profiles error:', profilesResult.error)
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
  }

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
        id: order.id as string,
        status: order.status as string,
        total: order.total as number,
        created_at: date,
        supplierName: (order.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur inconnu',
      })
    }
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[]

  const members = profiles.map(p => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    username: p.username,
    avatar_url: p.avatar_url,
    status: p.status ?? 'trial',
    cotisation_amount: p.cotisation_amount != null ? Number(p.cotisation_amount) : null,
    cotisation_active: p.cotisation_active ?? false,
    created_at: p.created_at,
    orderCount: ordersByMember[p.id]?.count ?? 0,
    orderTotal: ordersByMember[p.id]?.total ?? 0,
    lastOrderDate: ordersByMember[p.id]?.lastDate ?? null,
    recentOrders: ordersByMember[p.id]?.recent ?? [],
  }))

  const totalCotisations = members.reduce(
    (sum, m) => sum + (m.cotisation_amount ?? 0),
    0,
  )

  return NextResponse.json({
    members,
    stats: {
      totalCotisations,
      cotisationActive: members.filter(m => m.cotisation_active).length,
      cotised: members.filter(m => m.status === 'member').length,
      nonCotise: members.filter(m => m.status !== 'member').length,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const { memberId, status, cotisation_amount, cotisation_active } = body as {
    memberId?: string
    status?: string
    cotisation_amount?: number | null
    cotisation_active?: boolean
  }

  if (!memberId) {
    return NextResponse.json({ error: 'memberId requis.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
    }
    updates.status = status
  }

  if (cotisation_amount !== undefined) {
    if (cotisation_amount !== null && (typeof cotisation_amount !== 'number' || cotisation_amount < 0)) {
      return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
    }
    updates.cotisation_amount = cotisation_amount
  }

  if (cotisation_active !== undefined) {
    updates.cotisation_active = Boolean(cotisation_active)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(updates).eq('id', memberId)

  if (error) {
    console.error('[admin/members PATCH] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
