import { NextResponse, type NextRequest } from 'next/server'
import { listSharePools, requireShareMember, rpcErrorMessage, shareAdminClient } from '@/lib/sharing/server'
import { SHARE_MESSAGES } from '@/lib/sharing/eligibility'

export async function POST(request: NextRequest) {
  const ctx = await requireShareMember()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error.message }, { status: ctx.error.status })
  }

  const body = await request.json() as { poolId?: string }
  if (!body.poolId) {
    return NextResponse.json({ error: 'Partage manquant.' }, { status: 400 })
  }

  const { error } = await shareAdminClient().rpc('share_leave', {
    p_member_id: ctx.user.id,
    p_pool_id: body.poolId,
  })
  if (error) {
    return NextResponse.json({ error: rpcErrorMessage(error) }, { status: 400 })
  }

  const pools = await listSharePools(ctx.supabase)
  return NextResponse.json({ pools, notice: SHARE_MESSAGES.withdrawn })
}
