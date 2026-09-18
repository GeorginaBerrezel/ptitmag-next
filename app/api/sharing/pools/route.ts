import { NextResponse } from 'next/server'
import { listSharePools, requireShareMember } from '@/lib/sharing/server'

export async function GET() {
  const ctx = await requireShareMember()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error.message }, { status: ctx.error.status })
  }

  const pools = await listSharePools(ctx.supabase)
  return NextResponse.json({ viewerId: ctx.user.id, pools })
}
