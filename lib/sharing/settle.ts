import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { formatSupplierOrderDeadline } from '@/lib/catalog/supplier-orders'
import { sendOrderConfirmation } from '@/lib/email/sendOrderConfirmation'
import { sendShareNotice } from '@/lib/email/sendShareNotice'
import { roundChf } from '@/lib/members/credit'
import { memberPublicName } from './display-name'
import { formatShareQty } from './from-product'
import { isPoolFull, poolFilled, roundQty } from './pool-math'
import { createAdminClient } from '@/lib/supabase/admin'
import { planShareSettle, type SettleContribution, type SettlePlan } from './settle-plan'
import type { SupabaseClient } from '@supabase/supabase-js'

const PROBE_ID = '00000000-0000-0000-0000-000000000000'
const STALE_MS = 15 * 60 * 1000

let lastRun = 0

type PoolRow = {
  id: string
  product_id: string
  product_name: string
  supplier_id: string | null
  supplier_name: string
  supplier_type: string | null
  unit: string
  unit_price: number
  min_quantity: number
  share_target: number
  status: 'open' | 'ready' | 'deferred' | 'settling'
  deadline_at: string
  notice: string | null
}

type ContribRow = {
  id: string
  pool_id: string
  member_id: string
  quantity: number
  requested_quantity: number | null
  cover_max: number | null
  cover_at: string | null
  ordered_at: string | null
  order_id: string | null
}

function missingRpc(message: string): boolean {
  const raw = message.toLowerCase()
  return raw.includes('does not exist')
    || raw.includes('schema cache')
    || raw.includes('could not find the function')
    || raw.includes('pgrst202')
}

function toCover(row: ContribRow): SettleContribution {
  return {
    memberId: row.member_id,
    quantity: Number(row.quantity),
    coverMax: row.cover_max == null ? null : Number(row.cover_max),
    coverAt: row.cover_at,
    ordered: Boolean(row.ordered_at || row.order_id),
  }
}

/** À la date fournisseur : commande, report, ou annulation. Sans visite, Joel ou un cron déclenche aussi. */
export async function settleDueShares(opts?: { force?: boolean }): Promise<void> {
  if (!opts?.force && Date.now() - lastRun < 20_000) return
  lastRun = Date.now()

  const admin = createAdminClient()
  const probe = await admin.rpc('share_claim_settle', { p_pool_id: PROBE_ID })
  if (probe.error && missingRpc(probe.error.message)) {
    await admin.rpc('share_apply_deadlines')
    return
  }
  if (probe.error) {
    console.error('share_claim_settle', probe.error.message)
    return
  }

  try {
    await recoverStale(admin)
    await settleAll(admin)
  } catch (err) {
    console.error('settleDueShares', err)
  }
}

async function recoverStale(admin: SupabaseClient) {
  const stale = new Date(Date.now() - STALE_MS).toISOString()
  const { data } = await admin
    .from('share_pools')
    .select('id')
    .eq('status', 'settling')
    .lt('updated_at', stale)
  for (const row of data ?? []) {
    await admin.rpc('share_abort_settle', { p_pool_id: row.id })
  }
}

async function settleAll(admin: SupabaseClient) {
  const { data: pools, error } = await admin
    .from('share_pools')
    .select('id, product_id, product_name, supplier_id, supplier_name, supplier_type, unit, unit_price, min_quantity, share_target, status, deadline_at, notice')
    .in('status', ['open', 'ready', 'deferred'])

  if (error) {
    console.error('settleDueShares pools', error.message)
    return
  }

  const rows = (pools ?? []) as PoolRow[]
  if (rows.length === 0) return

  const poolIds = rows.map(row => row.id)
  const { data: contribs, error: contribError } = await admin
    .from('share_contributions')
    .select('id, pool_id, member_id, quantity, requested_quantity, cover_max, cover_at, ordered_at, order_id')
    .in('pool_id', poolIds)
  if (contribError) {
    console.error('settleDueShares contributions', contribError.message)
    return
  }

  const byPool = new Map<string, ContribRow[]>()
  for (const row of (contribs ?? []) as ContribRow[]) {
    const list = byPool.get(row.pool_id) ?? []
    list.push(row)
    byPool.set(row.pool_id, list)
  }

  const supplierIds = [...new Set(rows.map(row => row.supplier_id).filter((id): id is string => Boolean(id)))]
  const productIds = [...new Set(rows.map(row => row.product_id))]
  const [{ data: suppliers, error: supplierError }, { data: products, error: productError }] = await Promise.all([
    supplierIds.length
      ? admin.from('suppliers').select('id, active, orders_open, order_deadline').in('id', supplierIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from('products').select('id, active').in('id', productIds),
  ])
  if (supplierError || productError) {
    console.error('settleDueShares refs', supplierError?.message ?? productError?.message)
    return
  }

  const supplierById = new Map((suppliers ?? []).map(row => [row.id as string, row]))
  const productActive = new Map((products ?? []).map(row => [row.id as string, Boolean(row.active)]))
  const now = new Date()

  for (const pool of rows) {
    const contributions = byPool.get(pool.id) ?? []
    const supplier = pool.supplier_id ? supplierById.get(pool.supplier_id) : null
    let plan = planShareSettle({
      now,
      status: pool.status === 'deferred' ? 'deferred' : pool.status === 'ready' ? 'ready' : 'open',
      deadlineAt: pool.deadline_at,
      target: Number(pool.share_target),
      contributions: contributions.map(toCover),
      productActive: productActive.get(pool.product_id) ?? false,
      supplierActive: Boolean(supplier?.active),
      supplierOrdersOpen: Boolean(supplier?.orders_open),
      supplierDeadlineAt: (supplier?.order_deadline as string | null) ?? null,
    })

    if (plan.type === 'sync-deadline') {
      await admin
        .from('share_pools')
        .update({ deadline_at: plan.deadlineAt, updated_at: new Date().toISOString() })
        .eq('id', pool.id)
        .in('status', ['open', 'ready'])
      plan = planShareSettle({
        now,
        status: pool.status === 'ready' ? 'ready' : 'open',
        deadlineAt: plan.deadlineAt,
        target: Number(pool.share_target),
        contributions: contributions.map(toCover),
        productActive: true,
        supplierActive: true,
        supplierOrdersOpen: true,
        supplierDeadlineAt: plan.deadlineAt,
      })
    }

    if (plan.type === 'wait' || plan.type === 'sync-deadline') continue
    await applyPlan(admin, pool, contributions, plan)
  }
}

async function applyPlan(
  admin: SupabaseClient,
  pool: PoolRow,
  contributions: ContribRow[],
  plan: Exclude<SettlePlan, { type: 'wait' } | { type: 'sync-deadline' }>,
) {
  if (plan.type === 'defer') {
    const { data } = await admin
      .from('share_pools')
      .update({ status: 'deferred', notice: 'deferred', updated_at: new Date().toISOString() })
      .eq('id', pool.id)
      .in('status', ['open', 'ready'])
      .select('id')
    if (data?.length) await notify(admin, pool, contributions, 'deferred')
    return
  }

  if (plan.type === 'reopen') {
    const { data } = await admin
      .from('share_pools')
      .update({
        status: plan.full ? 'ready' : 'open',
        deadline_at: plan.deadlineAt,
        notice: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pool.id)
      .eq('status', 'deferred')
      .select('id')
    if (data?.length) {
      await notify(admin, { ...pool, deadline_at: plan.deadlineAt }, contributions, 'reopened')
    }
    return
  }

  if (plan.type === 'cancel') {
    const { data } = await admin
      .from('share_pools')
      .update({ status: 'closed', notice: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', pool.id)
      .in('status', ['open', 'ready', 'deferred'])
      .select('id')
    if (data?.length) await notify(admin, pool, contributions, 'cancelled', plan.reason)
    return
  }

  await orderPool(admin, pool, contributions, plan.quantities)
}

async function orderPool(
  admin: SupabaseClient,
  pool: PoolRow,
  contributions: ContribRow[],
  quantities: Array<{ memberId: string; quantity: number }>,
) {
  if (!pool.supplier_id) {
    await applyPlan(admin, pool, contributions, { type: 'cancel', reason: 'supplier' })
    return
  }

  const finalByMember = new Map(quantities.map(row => [row.memberId, row.quantity]))
  const finalSum = roundQty(contributions.reduce((sum, row) => {
    return sum + (finalByMember.get(row.member_id) ?? Number(row.quantity))
  }, 0))
  if (!isPoolFull(Number(pool.share_target), finalSum) || finalSum > Number(pool.share_target) + 1e-6) {
    console.error('settle share sum', pool.id, finalSum, pool.share_target)
    return
  }

  const claimed = await admin.rpc('share_claim_settle', { p_pool_id: pool.id })
  if (claimed.error || claimed.data !== true) return

  const created: string[] = []
  const mails: Array<() => Promise<void>> = []
  try {
    for (const row of contributions) {
      if (row.order_id) continue
      const quantity = finalByMember.get(row.member_id) ?? Number(row.quantity)
      const made = await createMemberOrder(admin, pool, row, quantity)
      created.push(made.orderId)
      if (made.send) mails.push(made.send)
    }
    const { data: closed } = await admin
      .from('share_pools')
      .update({ status: 'closed', notice: null, updated_at: new Date().toISOString() })
      .eq('id', pool.id)
      .eq('status', 'settling')
      .select('id')
    if (!closed?.length) throw new Error('close')
    for (const send of mails) {
      try {
        await send()
      } catch (err) {
        console.error('settle email', err)
      }
    }
  } catch (err) {
    console.error('settle order', pool.id, err)
    if (created.length > 0) {
      await admin.from('order_items').delete().in('order_id', created)
      await admin.from('orders').delete().in('id', created)
      for (const row of contributions) {
        await admin
          .from('share_contributions')
          .update({
            order_id: null,
            ordered_at: null,
            quantity: Number(row.requested_quantity ?? row.quantity),
          })
          .eq('id', row.id)
          .in('order_id', created)
      }
    }
    await admin.rpc('share_abort_settle', { p_pool_id: pool.id })
  }
}

async function createMemberOrder(
  admin: SupabaseClient,
  pool: PoolRow,
  row: ContribRow,
  quantity: number,
): Promise<{ orderId: string; send: (() => Promise<void>) | null }> {
  const profile = await loadProfile(admin, row.member_id)
  const unitPrice = getEffectiveUnitPrice(
    {
      unitPrice: Number(pool.unit_price),
      minQuantity: Number(pool.min_quantity),
      allowsPartialOrder: false,
      quantity,
    },
    { applyCielMarkup: profile?.status === 'ciel' },
  )
  const total = roundChf(quantity * unitPrice)
  const requested = Number(row.requested_quantity ?? row.quantity)

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      member_id: row.member_id,
      supplier_id: pool.supplier_id,
      status: 'confirmed',
      total,
      credit_applied: 0,
    })
    .select('id')
    .single()
  if (orderError || !order) throw new Error(orderError?.message ?? 'order')

  const { error: itemError } = await admin.from('order_items').insert({
    order_id: order.id,
    product_id: pool.product_id,
    quantity,
    unit_price: unitPrice,
  })
  if (itemError) {
    await admin.from('orders').delete().eq('id', order.id)
    throw new Error(itemError.message)
  }

  const { data: linked, error: linkError } = await admin
    .from('share_contributions')
    .update({
      quantity,
      requested_quantity: requested,
      order_id: order.id,
      ordered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .is('order_id', null)
    .select('id')
  if (linkError || !linked?.length) {
    await admin.from('order_items').delete().eq('order_id', order.id)
    await admin.from('orders').delete().eq('id', order.id)
    throw new Error(linkError?.message ?? 'link')
  }

  if (!profile?.email) return { orderId: order.id, send: null }
  const name = memberPublicName(profile)
  const detail = quantity > requested + 1e-9
    ? `Tu avais demandé ${formatShareQty(requested, pool.unit)}.`
    : 'Part d’un carton partagé.'
  const credit = roundChf(Number(profile.credit_balance) || 0)
  return {
    orderId: order.id,
    send: () => sendOrderConfirmation({
      memberEmail: profile.email!,
      memberName: name,
      orders: [{
        orderId: order.id,
        supplierName: pool.supplier_name,
        supplierType: pool.supplier_type ?? 'autre',
        items: [{
          productName: pool.product_name,
          quantity,
          unit: pool.unit,
          unitPrice,
          detail,
        }],
        total,
        grossTotal: total,
      }],
      globalTotal: total,
      creditPending: credit > 0,
    }),
  }
}

async function loadProfile(admin: SupabaseClient, memberId: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name, full_name, status, credit_balance')
    .eq('id', memberId)
    .maybeSingle()
  if (data?.email) return data
  const authUser = await admin.auth.admin.getUserById(memberId)
  const email = authUser.data.user?.email ?? null
  if (!data && !email) return null
  return { ...data, id: memberId, email }
}

async function notify(
  admin: SupabaseClient,
  pool: PoolRow,
  contributions: ContribRow[],
  kind: 'deferred' | 'reopened' | 'cancelled',
  reason?: 'product' | 'supplier',
) {
  const ids = contributions.map(row => row.member_id)
  if (ids.length === 0) return
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name, full_name')
    .in('id', ids)

  const members = []
  for (const id of ids) {
    const profile = (profiles ?? []).find(row => row.id === id)
    let email = profile?.email as string | null | undefined
    if (!email) {
      const authUser = await admin.auth.admin.getUserById(id)
      email = authUser.data.user?.email ?? null
    }
    if (!email) continue
    members.push({ email, name: memberPublicName(profile) })
  }

  const filled = poolFilled(contributions.map(row => ({
    memberId: row.member_id,
    displayName: '',
    quantity: Number(row.quantity),
  })))
  const missing = roundQty(Number(pool.share_target) - filled)
  const when = formatSupplierOrderDeadline(pool.deadline_at)
  let body = ''
  if (kind === 'deferred') {
    body = `<p>Il manque ${formatShareQty(missing, pool.unit)} sur <strong>${pool.product_name}</strong> (${pool.supplier_name}).</p>
      <p>Les commandes de ce fournisseur sont fermées. Vos parts sont gardées jusqu’à la prochaine ouverture. Aucun montant n’est dû.</p>`
  } else if (kind === 'reopened') {
    body = `<p>Les commandes de <strong>${pool.supplier_name}</strong> sont ouvertes jusqu’au ${when}.</p>
      <p>Ta part de <strong>${pool.product_name}</strong> est toujours là. Tu peux la modifier avant cette date.</p>`
  } else if (reason === 'product') {
    body = `<p><strong>${pool.product_name}</strong> n’est plus disponible. Le partage est annulé. Aucune commande n’a été créée, aucun montant n’est dû.</p>`
  } else {
    body = `<p>Le fournisseur <strong>${pool.supplier_name}</strong> n’est plus disponible. Le partage de <strong>${pool.product_name}</strong> est annulé. Aucun montant n’est dû.</p>`
  }

  try {
    await sendShareNotice({
      kind,
      productName: pool.product_name,
      supplierName: pool.supplier_name,
      body,
      members,
    })
  } catch (err) {
    console.error('share notice', err)
  }
}
