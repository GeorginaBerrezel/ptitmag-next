import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = [
  'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
]

/**
 * GET /api/admin/dashboard
 *
 * Retourne les données agrégées pour le tableau de bord :
 * - Statistiques membres et commandes
 * - Tendance mensuelle des 6 derniers mois (pour le graphique)
 * - Commandes récentes + membres récents
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Tout en parallèle pour minimiser la latence
  const [profilesResult, ordersResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, status, created_at, full_name, username, email')
      .order('created_at', { ascending: false }),
    admin
      .from('orders')
      .select('id, member_id, status, total, created_at, supplier:suppliers(name)')
      .order('created_at', { ascending: false }),
  ])

  const profiles = profilesResult.data ?? []
  const orders   = ordersResult.data ?? []

  // ── Statistiques membres ──────────────────────────────────────────────────
  const memberStats = {
    total:  profiles.length,
    trial:  profiles.filter(p => (p.status as string) === 'trial').length,
    member: profiles.filter(p => (p.status as string) === 'member').length,
  }

  // ── Statistiques commandes ────────────────────────────────────────────────
  const activeOrders = orders.filter(o => (o.status as string) !== 'cancelled')
  const orderStats = {
    confirmed: orders.filter(o => (o.status as string) === 'confirmed').length,
    delivered: orders.filter(o => (o.status as string) === 'delivered').length,
    cancelled: orders.filter(o => (o.status as string) === 'cancelled').length,
    total:     orders.length,
    revenue:   activeOrders.reduce((s, o) => s + (o.total as number), 0),
  }

  // ── Tendance mensuelle (6 derniers mois) ──────────────────────────────────
  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthOrders = orders.filter(o =>
      (o.created_at as string).startsWith(monthKey) &&
      (o.status as string) !== 'cancelled'
    )
    return {
      month:   monthKey,
      label:   d.toLocaleDateString('fr-CH', { month: 'short', year: '2-digit' }),
      count:   monthOrders.length,
      revenue: monthOrders.reduce((s, o) => s + (o.total as number), 0),
    }
  })

  // ── Commandes récentes (5 dernières) ─────────────────────────────────────
  // On a besoin des noms des membres → deuxième requête (cf. contrainte architecturale)
  const recentOrdersRaw = orders.slice(0, 5)
  const recentMemberIds = [...new Set(recentOrdersRaw.map(o => o.member_id as string))]

  const profilesMap: Record<string, string> = {}
  if (recentMemberIds.length > 0) {
    const { data: recentProfiles } = await admin
      .from('profiles')
      .select('id, full_name, username, email')
      .in('id', recentMemberIds)

    for (const p of recentProfiles ?? []) {
      profilesMap[p.id as string] =
        (p.full_name as string | null) ||
        (p.username as string | null) ||
        (p.email as string | null)?.split('@')[0] ||
        'Membre'
    }
  }

  const recentOrders = recentOrdersRaw.map(o => ({
    id:           o.id,
    status:       o.status,
    total:        o.total,
    created_at:   o.created_at,
    memberName:   profilesMap[o.member_id as string] ?? 'Membre',
    supplierName: (o.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur',
  }))

  // ── Membres récents (5 derniers inscrits) ─────────────────────────────────
  const recentMembers = profiles.slice(0, 5).map(p => ({
    id:         p.id,
    status:     p.status ?? 'trial',
    created_at: p.created_at,
    name:       (p.full_name as string | null) || (p.username as string | null) || (p.email as string | null)?.split('@')[0] || 'Membre',
  }))

  return NextResponse.json({
    memberStats,
    orderStats,
    monthlyData,
    recentOrders,
    recentMembers,
  })
}
