import { NextResponse, type NextRequest } from 'next/server'
import { listSharePools, requireShareMember, rpcErrorMessage, shareAdminClient } from '@/lib/sharing/server'
import type { ShareIfIncomplete } from '@/lib/sharing/types'

export async function POST(request: NextRequest) {
  const ctx = await requireShareMember()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error.message }, { status: ctx.error.status })
  }

  const body = await request.json() as { poolId?: string; ifIncomplete?: ShareIfIncomplete }
  if (!body.poolId || (body.ifIncomplete !== 'rollover' && body.ifIncomplete !== 'cancel')) {
    return NextResponse.json({ error: 'Choix manquant.' }, { status: 400 })
  }

  const { error } = await shareAdminClient().rpc('share_set_policy', {
    p_member_id: ctx.user.id,
    p_pool_id: body.poolId,
    p_if_incomplete: body.ifIncomplete,
  })
  if (error) {
    return NextResponse.json({ error: rpcErrorMessage(error) }, { status: 400 })
  }

  const pools = await listSharePools(ctx.supabase)
  return NextResponse.json({ pools })
}
