import { getEffectiveUnitPrice } from '@/lib/catalog/pricing'
import { formatSupplierOrderDeadline } from '@/lib/catalog/supplier-orders'
import { sendOrderConfirmation, sendShareOrdersAdminDigest, type OrderEmailGroup } from '@/lib/email/sendOrderConfirmation'
import { sendShareAdminDigest, sendShareDigest } from '@/lib/email/sendShareNotice'
import { roundChf } from '@/lib/members/credit'
import { memberPublicName } from './display-name'
import { formatShareQty } from './from-product'
import { isPoolFull, poolFilled, roundQty } from './pool-math'
import { createAdminClient } from '@/lib/supabase/admin'
import { planShareSettle, type SettleContribution, type SettlePlan } from './settle-plan'
import { expandFailedPools, groupByMemberSupplier } from './settle-batch'
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

type PendingNotice = {
  kind: 'deferred' | 'reopened' | 'cancelled'
  reason?: 'product' | 'supplier'
  pool: PoolRow
  contributions: ContribRow[]
}

type ReadyJob = {
  pool: PoolRow
  contributions: ContribRow[]
  quantities: Array<{ memberId: string; quantity: number }>
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
  const ready: ReadyJob[] = []
  const notices: PendingNotice[] = []

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
    if (plan.type === 'order') {
      ready.push({ pool, contributions, quantities: plan.quantities })
      continue
    }
    await applyPlan(admin, pool, contributions, plan, notices)
  }

  if (ready.length > 0) await orderReadyShares(admin, ready, notices)
  await sendNoticeDigests(admin, notices)
}

async function applyPlan(
  admin: SupabaseClient,
  pool: PoolRow,
  contributions: ContribRow[],
  plan: Exclude<SettlePlan, { type: 'wait' } | { type: 'sync-deadline' } | { type: 'order' }>,
  notices: PendingNotice[],
) {
  if (plan.type === 'defer') {
    const { data } = await admin
      .from('share_pools')
      .update({ status: 'deferred', notice: 'deferred', updated_at: new Date().toISOString() })
      .eq('id', pool.id)
      .in('status', ['open', 'ready'])
      .select('id')
    if (data?.length) notices.push({ kind: 'deferred', pool, contributions })
    return
  }

  if (plan.type === 'reopen') {
    const next = { ...pool, deadline_at: plan.deadlineAt }
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
    if (data?.length) notices.push({ kind: 'reopened', pool: next, contributions })
    return
  }

  const { data } = await admin
    .from('share_pools')
    .update({ status: 'closed', notice: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', pool.id)
    .in('status', ['open', 'ready', 'deferred'])
    .select('id')
  if (data?.length) notices.push({ kind: 'cancelled', reason: plan.reason, pool, contributions })
}

type ProfileRow = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  status?: string | null
  credit_balance?: number | null
}

type PreparedLine = {
  pool: PoolRow
  row: ContribRow
  memberId: string
  supplierId: string
  quantity: number
  unitPrice: number
  total: number
  requested: number
  detail: string
  profile: ProfileRow | null
}

type MadeOrder = {
  orderId: string
  memberId: string
  poolIds: string[]
  lines: PreparedLine[]
  total: number
}

async function orderReadyShares(
  admin: SupabaseClient,
  jobs: ReadyJob[],
  notices: PendingNotice[],
) {
  const claimed: PoolRow[] = []
  const lines: PreparedLine[] = []
  const profiles = new Map<string, ProfileRow | null>()

  for (const job of jobs) {
    if (!job.pool.supplier_id) {
      await applyPlan(admin, job.pool, job.contributions, { type: 'cancel', reason: 'supplier' }, notices)
      continue
    }
    const finalByMember = new Map(job.quantities.map(row => [row.memberId, row.quantity]))
    const finalSum = roundQty(job.contributions.reduce((sum, row) => {
      return sum + (finalByMember.get(row.member_id) ?? Number(row.quantity))
    }, 0))
    if (!isPoolFull(Number(job.pool.share_target), finalSum) || finalSum > Number(job.pool.share_target) + 1e-6) {
      console.error('settle share sum', job.pool.id, finalSum, job.pool.share_target)
      continue
    }

    const claim = await admin.rpc('share_claim_settle', { p_pool_id: job.pool.id })
    if (claim.error || claim.data !== true) continue
    claimed.push(job.pool)

    for (const row of job.contributions) {
      if (row.order_id) continue
      const quantity = finalByMember.get(row.member_id) ?? Number(row.quantity)
      if (!profiles.has(row.member_id)) profiles.set(row.member_id, await loadProfile(admin, row.member_id))
      const profile = profiles.get(row.member_id) ?? null
      const unitPrice = getEffectiveUnitPrice(
        {
          unitPrice: Number(job.pool.unit_price),
          minQuantity: Number(job.pool.min_quantity),
          allowsPartialOrder: false,
          quantity,
        },
        { applyCielMarkup: profile?.status === 'ciel' },
      )
      const requested = Number(row.requested_quantity ?? row.quantity)
      lines.push({
        pool: job.pool,
        row,
        memberId: row.member_id,
        supplierId: job.pool.supplier_id,
        quantity,
        unitPrice,
        total: roundChf(quantity * unitPrice),
        requested,
        detail: quantity > requested + 1e-9
          ? `Tu avais demandé ${formatShareQty(requested, job.pool.unit)}.`
          : 'Part d’un carton partagé.',
        profile,
      })
    }
  }

  const made: MadeOrder[] = []
  const failed = new Set<string>()
  for (const group of groupByMemberSupplier(lines)) {
    try {
      made.push(await insertMemberSupplierOrder(admin, group))
    } catch (err) {
      console.error('settle order', group[0]?.pool.id, err)
      for (const line of group) failed.add(line.pool.id)
    }
  }

  const doomedIds = expandFailedPools(made.map(order => ({ poolIds: order.poolIds })), failed)
  const doomed = made.filter(order => order.poolIds.some(id => doomedIds.has(id)))
  await undoOrders(admin, doomed)

  const kept = made.filter(order => !order.poolIds.some(id => doomedIds.has(id)))
  const closedIds = new Set<string>()
  const closeFailed = new Set<string>()
  for (const pool of claimed) {
    if (doomedIds.has(pool.id)) {
      await admin.rpc('share_abort_settle', { p_pool_id: pool.id })
      continue
    }
    const { data: closed } = await admin
      .from('share_pools')
      .update({ status: 'closed', notice: null, updated_at: new Date().toISOString() })
      .eq('id', pool.id)
      .eq('status', 'settling')
      .select('id')
    if (closed?.length) closedIds.add(pool.id)
    else closeFailed.add(pool.id)
  }

  const unclosed = expandFailedPools(kept.map(order => ({ poolIds: order.poolIds })), closeFailed)
  const dropped = kept.filter(order => order.poolIds.some(id => unclosed.has(id)))
  await undoOrders(admin, dropped)
  for (const pool of claimed) {
    if (!unclosed.has(pool.id) || doomedIds.has(pool.id)) continue
    if (closedIds.has(pool.id)) {
      await admin
        .from('share_pools')
        .update({ status: 'settling', updated_at: new Date().toISOString() })
        .eq('id', pool.id)
        .eq('status', 'closed')
    }
    console.error('settle close', pool.id)
    await admin.rpc('share_abort_settle', { p_pool_id: pool.id })
  }

  const mailed = kept.filter(order => !order.poolIds.some(id => unclosed.has(id)))
  await sendShareOrderMails(mailed)
}

async function undoOrders(admin: SupabaseClient, orders: MadeOrder[]) {
  if (orders.length === 0) return
  const orderIds = orders.map(order => order.orderId)
  for (const line of orders.flatMap(order => order.lines)) {
    await admin
      .from('share_contributions')
      .update({
        order_id: null,
        ordered_at: null,
        quantity: Number(line.row.requested_quantity ?? line.row.quantity),
        updated_at: new Date().toISOString(),
      })
      .eq('id', line.row.id)
      .in('order_id', orderIds)
  }
  await admin.from('order_items').delete().in('order_id', orderIds)
  await admin.from('orders').delete().in('id', orderIds)
}

async function insertMemberSupplierOrder(
  admin: SupabaseClient,
  lines: PreparedLine[],
): Promise<MadeOrder> {
  const first = lines[0]
  if (!first) throw new Error('empty')
  const total = roundChf(lines.reduce((sum, line) => sum + line.total, 0))
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      member_id: first.memberId,
      supplier_id: first.supplierId,
      status: 'confirmed',
      total,
      credit_applied: 0,
    })
    .select('id')
    .single()
  if (orderError || !order) throw new Error(orderError?.message ?? 'order')

  const { error: itemError } = await admin.from('order_items').insert(lines.map(line => ({
    order_id: order.id,
    product_id: line.pool.product_id,
    quantity: line.quantity,
    unit_price: line.unitPrice,
  })))
  if (itemError) {
    await admin.from('orders').delete().eq('id', order.id)
    throw new Error(itemError.message)
  }

  for (const line of lines) {
    const { data: linked, error: linkError } = await admin
      .from('share_contributions')
      .update({
        quantity: line.quantity,
        requested_quantity: line.requested,
        order_id: order.id,
        ordered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', line.row.id)
      .is('order_id', null)
      .select('id')
    if (linkError || !linked?.length) {
      for (const done of lines) {
        await admin
          .from('share_contributions')
          .update({
            order_id: null,
            ordered_at: null,
            quantity: Number(done.row.requested_quantity ?? done.row.quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', done.row.id)
      }
      await admin.from('order_items').delete().eq('order_id', order.id)
      await admin.from('orders').delete().eq('id', order.id)
      throw new Error(linkError?.message ?? 'link')
    }
  }

  return {
    orderId: order.id,
    memberId: first.memberId,
    poolIds: [...new Set(lines.map(line => line.pool.id))],
    lines,
    total,
  }
}

async function sendShareOrderMails(orders: MadeOrder[]) {
  const byMember = new Map<string, MadeOrder[]>()
  for (const order of orders) {
    const list = byMember.get(order.memberId) ?? []
    list.push(order)
    byMember.set(order.memberId, list)
  }

  for (const memberOrders of byMember.values()) {
    const profile = memberOrders[0]?.lines[0]?.profile
    if (!profile?.email) continue
    const groups: OrderEmailGroup[] = memberOrders.map(order => ({
      orderId: order.orderId,
      supplierName: order.lines[0]?.pool.supplier_name ?? '',
      supplierType: order.lines[0]?.pool.supplier_type ?? 'autre',
      items: order.lines.map(line => ({
        productName: line.pool.product_name,
        quantity: line.quantity,
        unit: line.pool.unit,
        unitPrice: line.unitPrice,
        detail: line.detail,
      })),
      total: order.total,
      grossTotal: order.total,
    }))
    const credit = roundChf(Number(profile.credit_balance) || 0)
    try {
      await sendOrderConfirmation({
        memberEmail: profile.email,
        memberName: memberPublicName(profile),
        orders: groups,
        globalTotal: roundChf(groups.reduce((sum, group) => sum + group.total, 0)),
        creditPending: credit > 0,
        purpose: 'share',
        notifyAdmin: false,
      })
    } catch (err) {
      console.error('settle email', err)
    }
  }

  const bySupplier = new Map<string, { supplierName: string; lines: Array<{ memberName: string; productName: string; quantityLabel: string; total: number }> }>()
  for (const order of orders) {
    for (const line of order.lines) {
      const key = line.supplierId
      const group = bySupplier.get(key) ?? { supplierName: line.pool.supplier_name, lines: [] }
      group.lines.push({
        memberName: memberPublicName(line.profile),
        productName: line.pool.product_name,
        quantityLabel: formatShareQty(line.quantity, line.pool.unit),
        total: line.total,
      })
      bySupplier.set(key, group)
    }
  }
  const digest = [...bySupplier.values()].sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'fr'))
  if (digest.length === 0) return
  try {
    await sendShareOrdersAdminDigest(digest)
  } catch (err) {
    console.error('settle admin email', err)
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

function noticeHtml(notice: PendingNotice): string {
  const { pool, contributions, kind, reason } = notice
  const filled = poolFilled(contributions.map(row => ({
    memberId: row.member_id,
    displayName: '',
    quantity: Number(row.quantity),
  })))
  const missing = roundQty(Number(pool.share_target) - filled)
  const when = formatSupplierOrderDeadline(pool.deadline_at)
  if (kind === 'deferred') {
    return `<p>Il manque ${formatShareQty(missing, pool.unit)} sur <strong>${pool.product_name}</strong> (${pool.supplier_name}).</p>
      <p>Les commandes de ce fournisseur sont fermées. Tes parts sont gardées jusqu’à la prochaine ouverture. Aucun montant n’est dû.</p>`
  }
  if (kind === 'reopened') {
    return `<p>Les commandes de <strong>${pool.supplier_name}</strong> sont ouvertes jusqu’au ${when}.</p>
      <p>Ta part de <strong>${pool.product_name}</strong> est toujours là. Tu peux la modifier avant cette date.</p>`
  }
  if (reason === 'product') {
    return `<p><strong>${pool.product_name}</strong> n’est plus disponible. Le partage est annulé. Aucune commande n’a été créée, aucun montant n’est dû.</p>`
  }
  return `<p>Le fournisseur <strong>${pool.supplier_name}</strong> n’est plus disponible. Le partage de <strong>${pool.product_name}</strong> est annulé. Aucun montant n’est dû.</p>`
}

async function sendNoticeDigests(admin: SupabaseClient, notices: PendingNotice[]) {
  if (notices.length === 0) return
  const ids = [...new Set(notices.flatMap(notice => notice.contributions.map(row => row.member_id)))]
  const { data: profiles } = ids.length
    ? await admin.from('profiles').select('id, email, first_name, last_name, full_name').in('id', ids)
    : { data: [] }

  const pieces: Array<{ kind: PendingNotice['kind']; email: string; name: string; html: string }> = []
  for (const notice of notices) {
    const html = noticeHtml(notice)
    const seen = new Set<string>()
    for (const row of notice.contributions) {
      if (seen.has(row.member_id)) continue
      seen.add(row.member_id)
      const profile = (profiles ?? []).find(item => item.id === row.member_id)
      let email = profile?.email as string | null | undefined
      if (!email) {
        const authUser = await admin.auth.admin.getUserById(row.member_id)
        email = authUser.data.user?.email ?? null
      }
      if (!email) continue
      pieces.push({ kind: notice.kind, email, name: memberPublicName(profile), html })
    }
  }

  const byPerson = new Map<string, typeof pieces>()
  for (const piece of pieces) {
    const key = `${piece.kind}\0${piece.email}`
    const list = byPerson.get(key) ?? []
    list.push(piece)
    byPerson.set(key, list)
  }
  for (const list of byPerson.values()) {
    const first = list[0]
    if (!first) continue
    try {
      await sendShareDigest({
        kind: first.kind,
        to: { email: first.email, name: first.name },
        bodyHtml: list.map(piece => piece.html).join(''),
      })
    } catch (err) {
      console.error('share notice', err)
    }
  }

  const cancelled = notices.filter(notice => notice.kind === 'cancelled')
  if (cancelled.length === 0) return
  try {
    await sendShareAdminDigest({
      kind: 'cancelled',
      bodyHtml: `<p>Ces partages sont annulés. Aucune commande n’a été créée, aucun montant n’est dû.</p>${cancelled.map(noticeHtml).join('')}`,
    })
  } catch (err) {
    console.error('share notice admin', err)
  }
}
