import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'
import {
  sendMemberStatusNotification,
  shouldSendMemberStatusEmail,
} from '@/lib/email/sendMemberStatusNotification'
import { ADMIN_MEMBER_STATUSES, normalizeMemberStatus } from '@/lib/members/profile'
import { parseCreditBalance } from '@/lib/members/credit'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  postal_code: string | null
  commune: string | null
  username: string | null
  avatar_url: string | null
  status: string | null
  created_at: string | null
  cotisation_amount: number | null
  cotisation_active: boolean | null
  credit_balance: number | null
}

const PROFILE_SELECT =
  'id, email, full_name, first_name, last_name, phone, postal_code, commune, username, avatar_url, status, created_at, cotisation_amount, cotisation_active, credit_balance'

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
      .select('id, member_id, status, total, credit_applied, created_at, supplier:suppliers(name)')
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
    credit_applied: number
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
        credit_applied: Number(order.credit_applied) || 0,
        created_at: date,
        supplierName: (order.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur inconnu',
      })
    }
  }

  const profiles = (profilesResult.data ?? []) as ProfileRow[]

  const members = profiles.map(p => {
    const status = normalizeMemberStatus(p.status)
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      first_name: p.first_name,
      last_name: p.last_name,
      phone: p.phone,
      postal_code: p.postal_code,
      commune: p.commune,
      username: p.username,
      avatar_url: p.avatar_url,
      status,
      cotisation_amount: p.cotisation_amount != null ? Number(p.cotisation_amount) : null,
      cotisation_active: p.cotisation_active ?? false,
      credit_balance: p.credit_balance != null ? Number(p.credit_balance) : 0,
      created_at: p.created_at,
      orderCount: ordersByMember[p.id]?.count ?? 0,
      orderTotal: ordersByMember[p.id]?.total ?? 0,
      lastOrderDate: ordersByMember[p.id]?.lastDate ?? null,
      recentOrders: ordersByMember[p.id]?.recent ?? [],
    }
  })

  const totalCotisations = members.reduce(
    (sum, m) => sum + (m.cotisation_amount ?? 0),
    0,
  )

  return NextResponse.json({
    members,
    stats: {
      totalCotisations,
      cotisationActive: members.filter(m => m.cotisation_active).length,
      nonMembre: members.filter(m => m.status === 'non_membre').length,
      ciel: members.filter(m => m.status === 'ciel').length,
      terre: members.filter(m => m.status === 'terre').length,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const { memberId, status, cotisation_amount, cotisation_active, credit_balance } = body as {
    memberId?: string
    status?: string
    cotisation_amount?: number | null
    cotisation_active?: boolean
    credit_balance?: number | null
  }

  if (!memberId) {
    return NextResponse.json({ error: 'memberId requis.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (status !== undefined) {
    if (!ADMIN_MEMBER_STATUSES.includes(status as (typeof ADMIN_MEMBER_STATUSES)[number])) {
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

  if (credit_balance !== undefined) {
    const parsed = credit_balance === null ? 0 : parseCreditBalance(credit_balance)
    if (parsed === null) {
      return NextResponse.json({ error: 'Avoir invalide (montant ≥ 0).' }, { status: 400 })
    }
    updates.credit_balance = parsed
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existing, error: fetchError } = await admin
    .from('profiles')
    .select('email, first_name, last_name, full_name, status, cotisation_amount, cotisation_active')
    .eq('id', memberId)
    .single()

  if (fetchError || !existing) {
    console.error('[admin/members PATCH] profile fetch error:', fetchError)
    return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 })
  }

  const oldStatus = normalizeMemberStatus(existing.status as string)

  const { error } = await admin.from('profiles').update(updates).eq('id', memberId)

  if (error) {
    console.error('[admin/members PATCH] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const newStatus = status !== undefined
    ? normalizeMemberStatus(status)
    : oldStatus

  const memberName = [existing.first_name, existing.last_name].filter(Boolean).join(' ').trim()
    || (existing.full_name as string | null)
    || null

  const cotisationAmount = cotisation_amount !== undefined
    ? cotisation_amount
    : existing.cotisation_amount != null ? Number(existing.cotisation_amount) : null

  const cotisationActive = cotisation_active !== undefined
    ? Boolean(cotisation_active)
    : Boolean(existing.cotisation_active)

  if (
    status !== undefined &&
    existing.email &&
    shouldSendMemberStatusEmail(oldStatus, newStatus)
  ) {
    try {
      await sendMemberStatusNotification({
        memberEmail: existing.email as string,
        memberName,
        oldStatus,
        newStatus,
        cotisationAmount,
        cotisationActive,
      })
    } catch (err) {
      console.error('[email] Échec notification statut membre :', err)
    }
  }

  return NextResponse.json({ success: true })
}
