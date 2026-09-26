import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessCatalog } from '@/lib/members/profile'
import type { Product } from '@/lib/supabase/products'
import { memberPublicName } from './display-name'
import { isShareEnabled, SHARE_MESSAGES } from './eligibility'
import { productToShare } from './from-product'
import { isPoolFull, poolFilled, poolRemaining } from './pool-math'
import { settleDueShares } from './settle'
import type { ShareIfIncomplete, SharePoolView, ShareProduct } from './types'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ShareServerCtx = {
  supabase: SupabaseClient
  user: User
}

export async function requireShareMember(): Promise<
  { error: { message: string; status: number } } | ShareServerCtx
> {
  if (!isShareEnabled()) {
    return { error: { message: 'Partages désactivés.', status: 404 } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: { message: 'Non authentifié.', status: 401 } }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccessCatalog(profile)) {
    return { error: { message: 'Accès catalogue requis.', status: 403 } }
  }

  return { supabase, user }
}

/** Prix / nom / cible lus en base. Le JSON du navigateur n’est pas une source. */
export async function loadShareProduct(
  supabase: SupabaseClient,
  productId: string,
): Promise<ShareProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id, name, description, category,
      unit, unit_price, min_quantity, allows_partial_order,
      order_deadline, is_featured, supplier_ref,
      supplier:suppliers(id, name, website, type, active)
    `,
    )
    .eq('id', productId)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return null
  const product = data as unknown as Product
  return productToShare(product, Number(product.min_quantity))
}

/** RPC partages : clé service_role (auth.uid() est vide). */
export function shareAdminClient() {
  return createAdminClient()
}

type PoolRow = {
  id: string
  product_id: string
  product_name: string
  supplier_id: string | null
  supplier_name: string
  supplier_type: string | null
  supplier_ref: string | null
  unit: string
  unit_price: number
  min_quantity: number
  allows_partial_order: boolean
  share_target: number
  share_step: number
  image_url: string | null
  if_incomplete: ShareIfIncomplete
  status: 'open' | 'ready' | 'deferred' | 'settling' | 'closed'
  deadline_at: string | null
  notice: string | null
}

function productFromRow(row: PoolRow): ShareProduct {
  return {
    id: row.product_id,
    name: row.product_name,
    supplierName: row.supplier_name,
    supplierId: row.supplier_id,
    supplierType: row.supplier_type,
    supplierRef: row.supplier_ref,
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    minQuantity: Number(row.min_quantity),
    allowsPartialOrder: row.allows_partial_order,
    shareTarget: Number(row.share_target),
    shareStep: Number(row.share_step),
    imageUrl: row.image_url,
  }
}

export async function applyShareDeadlines() {
  try {
    const { error } = await shareAdminClient().rpc('share_apply_deadlines')
    if (error && error.code !== '42P01' && !/does not exist/i.test(error.message)) {
      console.error('share_apply_deadlines', error.message)
    }
  } catch (err) {
    console.error('share_apply_deadlines', err)
  }
}

export async function listSharePools(supabase: SupabaseClient): Promise<SharePoolView[]> {
  await settleDueShares()

  const { data: pools, error } = await supabase
    .from('share_pools')
    .select(
      'id, product_id, product_name, supplier_id, supplier_name, supplier_type, supplier_ref, unit, unit_price, min_quantity, allows_partial_order, share_target, share_step, image_url, if_incomplete, status, deadline_at, notice',
    )
    .in('status', ['open', 'ready', 'deferred'])
    .order('updated_at', { ascending: false })

  if (error) {
    if (error.code === '42P01' || /share_pools|notice|deferred/i.test(error.message)) {
      return listSharePoolsLegacy(supabase)
    }
    console.error('listSharePools', error.message)
    return []
  }

  const rows = (pools ?? []) as PoolRow[]
  if (rows.length === 0) return []
  return mapSharePools(supabase, rows)
}

async function listSharePoolsLegacy(supabase: SupabaseClient): Promise<SharePoolView[]> {
  const { data: pools, error } = await supabase
    .from('share_pools')
    .select(
      'id, product_id, product_name, supplier_id, supplier_name, supplier_type, supplier_ref, unit, unit_price, min_quantity, allows_partial_order, share_target, share_step, image_url, if_incomplete, status, deadline_at',
    )
    .in('status', ['open', 'ready'])
    .order('updated_at', { ascending: false })

  if (error) {
    if (error.code === '42P01' || /share_pools/i.test(error.message)) return []
    console.error('listSharePools', error.message)
    return []
  }
  return mapSharePools(supabase, (pools ?? []) as PoolRow[])
}

async function mapSharePools(supabase: SupabaseClient, rows: PoolRow[]): Promise<SharePoolView[]> {
  if (rows.length === 0) return []
  const ids = rows.map(r => r.id)
  const rich = await supabase
    .from('share_contributions')
    .select('pool_id, member_id, quantity, ordered_at, cover_max, cover_at, requested_quantity')
    .in('pool_id', ids)
  const contribResult = rich.error && /cover_max|requested_quantity/i.test(rich.error.message)
    ? await supabase
      .from('share_contributions')
      .select('pool_id, member_id, quantity, ordered_at')
      .in('pool_id', ids)
    : rich

  if (contribResult.error) {
    console.error('listShareContributions', contribResult.error.message)
    return []
  }

  const contribs = contribResult.data ?? []
  const memberIds = [...new Set(contribs.map(c => c.member_id as string))]
  const names = new Map<string, string>()
  if (memberIds.length > 0) {
    const adminProfiles = await shareAdminClient()
      .from('profiles')
      .select('id, first_name, last_name, full_name')
      .in('id', memberIds)
    const profiles = adminProfiles.error
      ? (await supabase.from('profiles').select('id, first_name, full_name').in('id', memberIds)).data
      : adminProfiles.data
    for (const p of profiles ?? []) {
      names.set(p.id as string, memberPublicName(p))
    }
  }

  return rows.map(row => {
    const contributions = contribs
      .filter(c => c.pool_id === row.id)
      .map(c => {
        const coverMax = 'cover_max' in c && c.cover_max != null ? Number(c.cover_max) : null
        const requested = 'requested_quantity' in c && c.requested_quantity != null
          ? Number(c.requested_quantity)
          : Number(c.quantity)
        return {
          memberId: c.member_id as string,
          displayName: names.get(c.member_id as string) ?? 'Membre',
          quantity: Number(c.quantity),
          requestedQuantity: requested,
          coverMax,
          coverAt: 'cover_at' in c ? (c.cover_at as string | null) : null,
          ordered: Boolean(c.ordered_at),
        }
      })
    const product = productFromRow(row)
    const target = Number(row.share_target)
    const filled = poolFilled(contributions)
    const status = row.status === 'deferred' ? 'deferred' as const
      : row.status === 'ready' ? 'ready' as const
      : 'open' as const
    return {
      id: row.id,
      productId: row.product_id,
      product,
      ifIncomplete: row.if_incomplete,
      status,
      deadlineAt: row.deadline_at,
      contributions,
      filled,
      remaining: poolRemaining(target, filled),
      isFull: isPoolFull(target, filled) || status === 'ready',
    }
  })
}

export function rpcErrorMessage(err: { message?: string } | null): string {
  const raw = (err?.message ?? '').toLowerCase()
  if (raw.includes('whole_carton')) return SHARE_MESSAGES.wholeCarton
  if (raw.includes('no_room')) return SHARE_MESSAGES.noRoom
  if (raw.includes('too_small')) return SHARE_MESSAGES.tooSmall
  if (raw.includes('already_ordered')) return SHARE_MESSAGES.alreadyOrdered
  if (raw.includes('pool_ordering')) return SHARE_MESSAGES.poolOrdering
  if (raw.includes('not_catalog_member')) return 'Accès catalogue requis.'
  if (raw.includes('supplier_closed')) return SHARE_MESSAGES.supplierClosed
  if (raw.includes('cover_too_small')) return SHARE_MESSAGES.coverTooSmall
  if (raw.includes('cover_too_big')) return SHARE_MESSAGES.coverTooBig
  if (raw.includes('product_missing') || raw.includes('not_shareable')) {
    return SHARE_MESSAGES.unavailable
  }
  if (
    raw.includes('42p01')
    || raw.includes('schema cache')
    || raw.includes('could not find the function')
    || (raw.includes('share_join') && raw.includes('does not exist'))
    || raw.includes('does not exist')
  ) {
    return SHARE_MESSAGES.sqlMissing
  }
  return err?.message || 'Impossible d’enregistrer la part.'
}

/** Enregistre le plafond « je peux prendre plus ». null retire la case. */
export async function saveShareCover(
  memberId: string,
  poolId: string,
  coverMax: number | null,
): Promise<{ error?: string }> {
  const admin = shareAdminClient()
  if (coverMax == null) {
    const { error } = await admin
      .from('share_contributions')
      .update({ cover_max: null, cover_at: null, updated_at: new Date().toISOString() })
      .eq('pool_id', poolId)
      .eq('member_id', memberId)
    if (error) return { error: rpcErrorMessage(error) }
    return {}
  }

  const { data: existing, error: readError } = await admin
    .from('share_contributions')
    .select('cover_at')
    .eq('pool_id', poolId)
    .eq('member_id', memberId)
    .maybeSingle()
  if (readError) return { error: rpcErrorMessage(readError) }

  const { error } = await admin
    .from('share_contributions')
    .update({
      cover_max: coverMax,
      cover_at: existing?.cover_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('pool_id', poolId)
    .eq('member_id', memberId)
  if (error) return { error: rpcErrorMessage(error) }
  return {}
}
