import { NextResponse, type NextRequest } from 'next/server'
import { normalizeCoverMax } from '@/lib/sharing/cover'
import { SHARE_MESSAGES } from '@/lib/sharing/eligibility'
import {
  listSharePools,
  loadShareProduct,
  requireShareMember,
  rpcErrorMessage,
  saveShareCover,
  shareAdminClient,
} from '@/lib/sharing/server'
import type { ShareIfIncomplete } from '@/lib/sharing/types'

export async function POST(request: NextRequest) {
  const ctx = await requireShareMember()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error.message }, { status: ctx.error.status })
  }

  const body = await request.json() as {
    productId?: string
    product?: { id?: string }
    quantity?: number
    ifIncomplete?: ShareIfIncomplete
    coverMax?: number | null
  }
  const productId = body.productId ?? body.product?.id
  const quantity = Number(body.quantity)
  if (!productId || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: 'Données de partage incomplètes.' }, { status: 400 })
  }

  const share = await loadShareProduct(ctx.supabase, productId)
  const hasCover = Object.prototype.hasOwnProperty.call(body, 'coverMax')

  const { data, error } = await shareAdminClient().rpc('share_join', {
    p_member_id: ctx.user.id,
    p_product_id: productId,
    p_quantity: quantity,
    p_if_incomplete: body.ifIncomplete === 'cancel' ? 'cancel' : 'rollover',
    p_image_url: share?.imageUrl ?? null,
  })

  if (error) {
    return NextResponse.json({ error: rpcErrorMessage(error) }, { status: 400 })
  }

  const joined = data as { poolId?: string; quantity?: number } | null
  if (hasCover && joined?.poolId) {
    const { data: poolRow } = await shareAdminClient()
      .from('share_pools')
      .select('share_target, share_step')
      .eq('id', joined.poolId)
      .maybeSingle()
    const target = Number(poolRow?.share_target ?? share?.shareTarget ?? 0)
    const step = Number(poolRow?.share_step ?? share?.shareStep ?? 1)
    const chosen = Number(joined.quantity ?? quantity)
    const norm = normalizeCoverMax(
      body.coverMax == null ? null : Number(body.coverMax),
      chosen,
      target,
      step,
    )
    if (!norm.ok) {
      const pools = await listSharePools(ctx.supabase)
      const message = norm.error === 'too_big' ? SHARE_MESSAGES.coverTooBig : SHARE_MESSAGES.coverTooSmall
      return NextResponse.json({ pools, error: message }, { status: 400 })
    }
    const saved = await saveShareCover(ctx.user.id, joined.poolId, norm.coverMax)
    if (saved.error) {
      const pools = await listSharePools(ctx.supabase)
      return NextResponse.json({ pools, error: saved.error }, { status: 400 })
    }
  }

  const pools = await listSharePools(ctx.supabase)
  const joinedExisting = Boolean((data as { joinedExisting?: boolean } | null)?.joinedExisting)
  return NextResponse.json({
    pools,
    notice: joinedExisting ? SHARE_MESSAGES.joinExisting : undefined,
  })
}
