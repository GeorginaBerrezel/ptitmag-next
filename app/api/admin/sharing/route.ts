import { NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'
import { formatShareQty } from '@/lib/sharing/from-product'
import { memberPublicName } from '@/lib/sharing/display-name'
import { settleDueShares } from '@/lib/sharing/settle'
import { createAdminClient } from '@/lib/supabase/admin'

const RECENT_MS = 45 * 24 * 60 * 60 * 1000

type PoolRow = {
  id: string
  product_name: string
  supplier_name: string
  unit: string
  share_target: number
  status: string
  deadline_at: string | null
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
  const since = new Date(Date.now() - RECENT_MS).toISOString()
  const { data: active, error: activeError } = await admin
    .from('share_pools')
    .select('id, product_name, supplier_name, unit, share_target, status, deadline_at, updated_at')
    .in('status', ['open', 'ready', 'deferred'])
    .order('deadline_at', { ascending: true })

  if (activeError) {
    if (/share_pools|42P01/i.test(activeError.message)) {
      return NextResponse.json({ cartons: [] })
    }
    return NextResponse.json({ error: activeError.message }, { status: 500 })
  }

  const { data: closed } = await admin
    .from('share_pools')
    .select('id, product_name, supplier_name, unit, share_target, status, deadline_at, updated_at')
    .eq('status', 'closed')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })

  const pools = [...(active ?? []), ...(closed ?? [])] as PoolRow[]
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

  const cartons = pools.map(pool => {
    const people = (contribs ?? []).filter(row => row.pool_id === pool.id)
    const ordered = people.some(row => row.ordered_at || row.order_id)
    const label = pool.status === 'deferred'
      ? 'Reporté · prochaine ouverture'
      : pool.status === 'ready'
        ? 'Complet · commande à la date'
        : pool.status === 'open'
          ? 'En attente'
          : ordered
            ? 'Commandé'
            : 'Annulé'
    return {
      id: pool.id,
      productName: pool.product_name,
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
