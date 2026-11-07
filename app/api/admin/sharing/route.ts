import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'
import { sendShareDigest } from '@/lib/email/sendShareNotice'
import { assignCartonNumbers } from '@/lib/sharing/cartons'
import { formatShareQty } from '@/lib/sharing/from-product'
import { memberPublicName } from '@/lib/sharing/display-name'
import { settleDueShares } from '@/lib/sharing/settle'
import { createAdminClient } from '@/lib/supabase/admin'

type PoolRow = {
  id: string
  product_id: string
  product_name: string
  supplier_name: string
  unit: string
  share_target: number
  status: string
  deadline_at: string | null
  created_at: string
  updated_at: string
}

export async function GET() {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  try {
    await settleDueShares({ force: true })
  } catch (err) {
    console.error('admin sharing settle', err)
  }

  const admin = createAdminClient()
  const { data: active, error: activeError } = await admin
    .from('share_pools')
    .select('id, product_id, product_name, supplier_name, unit, share_target, status, deadline_at, created_at, updated_at')
    .in('status', ['open', 'ready', 'deferred'])
    .order('deadline_at', { ascending: true })

  if (activeError) {
    if (/share_pools|42P01/i.test(activeError.message)) {
      return NextResponse.json({ cartons: [] })
    }
    return NextResponse.json({ error: activeError.message }, { status: 500 })
  }

  const pools = (active ?? []) as PoolRow[]
  if (pools.length === 0) return NextResponse.json({ cartons: [] })

  const ids = pools.map(pool => pool.id)
  const { data: contribs, error: contribError } = await admin
    .from('share_contributions')
    .select('pool_id, member_id, quantity, requested_quantity, ordered_at, order_id')
    .in('pool_id', ids)

  if (contribError) {
    return NextResponse.json({ error: contribError.message }, { status: 500 })
  }

  const memberIds = [...new Set((contribs ?? []).map(row => row.member_id as string))]
  const names = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, first_name, last_name, full_name')
      .in('id', memberIds)
    for (const profile of profiles ?? []) {
      names.set(profile.id as string, memberPublicName(profile))
    }
  }

  const cartonNumbers = assignCartonNumbers(pools.map(pool => ({
    id: pool.id,
    productId: pool.product_id,
    createdAt: pool.created_at,
  })))
  const cartonCounts = new Map<string, number>()
  for (const pool of pools) {
    cartonCounts.set(pool.product_id, (cartonCounts.get(pool.product_id) ?? 0) + 1)
  }

  const cartons = pools.map(pool => {
    const number = cartonNumbers.get(pool.id) ?? 1
    const count = cartonCounts.get(pool.product_id) ?? 1
    const people = (contribs ?? []).filter(row => row.pool_id === pool.id)
    const label = pool.status === 'deferred'
      ? 'Reporté · prochaine ouverture'
      : pool.status === 'ready'
        ? 'Complet · commande à la limite'
        : 'En attente'
    return {
      id: pool.id,
      productName: count > 1 ? `Carton ${number} · ${pool.product_name}` : pool.product_name,
      supplierName: pool.supplier_name,
      targetLabel: formatShareQty(Number(pool.share_target), pool.unit),
      deadlineAt: pool.deadline_at,
      label,
      members: people.map(row => {
        const quantity = Number(row.quantity)
        const requested = row.requested_quantity == null ? quantity : Number(row.requested_quantity)
        const name = names.get(row.member_id as string) ?? 'Membre'
        const extra = quantity > requested + 1e-9
          ? ` (avait demandé ${formatShareQty(requested, pool.unit)})`
          : ''
        return `${name} · ${formatShareQty(quantity, pool.unit)}${extra}`
      }),
    }
  })

  return NextResponse.json({ cartons })
}

/** Annule un partage encore ouvert. Un mail aux personnes : rien à payer. */
export async function POST(request: Request) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json().catch(() => null) as { poolId?: string } | null
  const poolId = body?.poolId
  if (!poolId) return NextResponse.json({ error: 'Partage manquant.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: pool, error: poolError } = await admin
    .from('share_pools')
    .select('id, product_name, supplier_name, status')
    .eq('id', poolId)
    .maybeSingle()

  if (poolError) return NextResponse.json({ error: poolError.message }, { status: 500 })
  if (!pool || !['open', 'ready', 'deferred'].includes(pool.status as string)) {
    return NextResponse.json({ error: 'Ce partage ne peut plus être annulé.' }, { status: 409 })
  }

  const { data: closed, error: closeError } = await admin
    .from('share_pools')
    .update({ status: 'closed', notice: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', poolId)
    .in('status', ['open', 'ready', 'deferred'])
    .select('id')

  if (closeError) return NextResponse.json({ error: closeError.message }, { status: 500 })
  if (!closed?.length) {
    return NextResponse.json({ error: 'Ce partage ne peut plus être annulé.' }, { status: 409 })
  }

  const { data: contribs } = await admin
    .from('share_contributions')
    .select('member_id')
    .eq('pool_id', poolId)

  const memberIds = [...new Set((contribs ?? []).map(row => row.member_id as string))]
  if (memberIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, first_name, last_name, full_name')
      .in('id', memberIds)

    const bodyHtml = `<p>Le partage de <strong>${pool.product_name}</strong> (${pool.supplier_name}) est annulé. Rien à payer.</p>`
    for (const id of memberIds) {
      const profile = (profiles ?? []).find(row => row.id === id)
      let email = profile?.email as string | null | undefined
      if (!email) {
        const authUser = await admin.auth.admin.getUserById(id)
        email = authUser.data.user?.email ?? null
      }
      if (!email) continue
      try {
        await sendShareDigest({
          kind: 'cancelled',
          to: { email, name: memberPublicName(profile) },
          bodyHtml,
        })
      } catch (err) {
        console.error('share cancel email', err)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
