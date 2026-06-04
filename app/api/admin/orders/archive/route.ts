import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import { countEligibleForArchive, isEligibleForArchive } from '@/lib/admin/order-archive'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/admin/orders/archive
 * Body: { bulk?: true } | { orderId: string, unarchive?: boolean }
 */
export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()
  const now = new Date().toISOString()

  if (body.bulk === true) {
    const { data: orders, error } = await admin
      .from('orders')
      .select('id, status, created_at, archived_at')
      .is('archived_at', null)
      .eq('status', 'closed')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const eligibleIds = (orders ?? [])
      .filter(o => isEligibleForArchive(o as { status: string; created_at: string; archived_at?: string | null }))
      .map(o => (o as { id: string }).id)

    if (eligibleIds.length === 0) {
      return NextResponse.json({
        success: true,
        archivedCount: 0,
        message: 'Aucune commande éligible à l\'archivage.',
      })
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({ archived_at: now })
      .in('id', eligibleIds)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      archivedCount: eligibleIds.length,
      message: `${eligibleIds.length} commande(s) archivée(s).`,
    })
  }

  const { orderId, unarchive } = body
  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'orderId requis.' }, { status: 400 })
  }

  if (unarchive === true) {
    const { error } = await admin
      .from('orders')
      .update({ archived_at: null })
      .eq('id', orderId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Commande restaurée dans l\'historique actif.',
    })
  }

  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, status, created_at, archived_at')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  if ((order as { status: string }).status !== 'closed') {
    return NextResponse.json({
      error: 'Seules les commandes clôturées peuvent être archivées.',
    }, { status: 400 })
  }

  if ((order as { archived_at?: string | null }).archived_at) {
    return NextResponse.json({ error: 'Commande déjà archivée.' }, { status: 400 })
  }

  const { error } = await admin
    .from('orders')
    .update({ archived_at: now })
    .eq('id', orderId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Commande archivée.',
  })
}

/** GET — nombre de commandes éligibles à l'archivage */
export async function GET() {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: orders, error } = await admin
    .from('orders')
    .select('status, created_at, archived_at')
    .is('archived_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    eligibleCount: countEligibleForArchive(orders ?? []),
  })
}
