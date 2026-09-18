import { NextResponse, type NextRequest } from 'next/server'
import {
  loadShareProduct,
  listSharePools,
  requireShareMember,
  rpcErrorMessage,
  shareAdminClient,
} from '@/lib/sharing/server'
import { SHARE_MESSAGES } from '@/lib/sharing/eligibility'
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
  }
  const productId = body.productId ?? body.product?.id
  const quantity = Number(body.quantity)
  if (!productId || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: 'Données de partage incomplètes.' }, { status: 400 })
  }

  const share = await loadShareProduct(ctx.supabase, productId)

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

  const pools = await listSharePools(ctx.supabase)
  const joinedExisting = Boolean((data as { joinedExisting?: boolean } | null)?.joinedExisting)
  return NextResponse.json({
    pools,
    notice: joinedExisting ? SHARE_MESSAGES.joinExisting : undefined,
  })
}
