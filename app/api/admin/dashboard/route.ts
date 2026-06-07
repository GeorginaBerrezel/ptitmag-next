import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'
import { isActiveMemberStatus, normalizeMemberStatus } from '@/lib/members/profile'

/**
 * GET /api/admin/dashboard
 *
 * Retourne les données agrégées pour le tableau de bord :
 * - Statistiques membres et commandes
 * - Tendance mensuelle des 6 derniers mois (pour le graphique)
 * - Commandes récentes + membres récents
 */
export async function GET() {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Tout en parallèle pour minimiser la latence
  const [profilesResult, ordersResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, status, created_at, full_name, username, email, cotisation_amount, cotisation_active')
      .order('created_at', { ascending: false }),
    admin
      .from('orders')
      .select('id, member_id, status, total, credit_applied, created_at, supplier:suppliers(name)')
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
  ])

  const profiles = profilesResult.data ?? []
  const orders   = ordersResult.data ?? []

  // ── Statistiques membres ──────────────────────────────────────────────────
  const memberStats = {
    total: profiles.length,
    nonMembre: profiles.filter(p => normalizeMemberStatus(p.status as string) === 'non_membre').length,
    ciel: profiles.filter(p => normalizeMemberStatus(p.status as string) === 'ciel').length,
    terre: profiles.filter(p => normalizeMemberStatus(p.status as string) === 'terre').length,
    cotisationActive: profiles.filter(p => p.cotisation_active === true).length,
    totalCotisations: profiles.reduce(
      (sum, p) => sum + (p.cotisation_amount != null ? Number(p.cotisation_amount) : 0),
      0,
    ),
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

  const monthlyMembers = Array.from({ length: 6 }, (_, i) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)
    const count = profiles.filter(p => {
      if (!isActiveMemberStatus(p.status as string)) return false
      if (!p.created_at) return false
      return new Date(p.created_at as string) <= endOfMonth
    }).length
    return {
      month: monthKey,
      label: monthDate.toLocaleDateString('fr-CH', { month: 'short', year: '2-digit' }),
      count,
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
    credit_applied: o.credit_applied ?? 0,
    created_at:   o.created_at,
    memberName:   profilesMap[o.member_id as string] ?? 'Membre',
    supplierName: (o.supplier as unknown as { name: string } | null)?.name ?? 'Fournisseur',
  }))

  // ── Membres récents (5 derniers inscrits) ─────────────────────────────────
  const recentMembers = profiles.slice(0, 5).map(p => ({
    id:         p.id,
    status:     normalizeMemberStatus(p.status as string),
    created_at: p.created_at,
    name:       (p.full_name as string | null) || (p.username as string | null) || (p.email as string | null)?.split('@')[0] || 'Membre',
  }))

  return NextResponse.json({
    memberStats,
    orderStats,
    monthlyData,
    monthlyMembers,
    recentOrders,
    recentMembers,
  })
}
