import { createClient } from '@/lib/supabase/server'
import { normalizePickupIds } from '@/lib/members/pickup-checklist'
import { NextResponse, type NextRequest } from 'next/server'

async function requireMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }) }
  }
  return { supabase, user }
}

async function listIds(supabase: Awaited<ReturnType<typeof createClient>>, memberId: string) {
  const { data, error } = await supabase
    .from('member_pickup_checks')
    .select('order_item_id')
    .eq('member_id', memberId)

  if (error) return { error }
  const itemIds = (data ?? [])
    .map(row => row.order_item_id as string)
    .filter(id => typeof id === 'string')
  return { itemIds }
}

/** Ne garde que les lignes des commandes de ce membre. */
async function ownedItemIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return []

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('member_id', memberId)

  if (ordersError || !orders?.length) return []

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id')
    .in('id', ids)
    .in('order_id', orders.map(order => order.id as string))

  if (itemsError || !items) return []
  return items.map(item => item.id as string)
}

export async function GET() {
  const ctx = await requireMember()
  if ('error' in ctx) return ctx.error

  const listed = await listIds(ctx.supabase, ctx.user.id)
  if ('error' in listed && listed.error) {
    console.error('[pickup-checks GET]', listed.error)
    return NextResponse.json({ error: listed.error.message }, { status: 500 })
  }

  return NextResponse.json({ itemIds: listed.itemIds ?? [] })
}

export async function POST(request: NextRequest) {
  const ctx = await requireMember()
  if ('error' in ctx) return ctx.error

  const body = await request.json().catch(() => ({})) as { add?: unknown; remove?: unknown }
  const add = await ownedItemIds(ctx.supabase, ctx.user.id, normalizePickupIds(body.add))
  const remove = normalizePickupIds(body.remove)

  if (add.length > 0) {
    const { error } = await ctx.supabase
      .from('member_pickup_checks')
      .upsert(
        add.map(orderItemId => ({ member_id: ctx.user.id, order_item_id: orderItemId })),
        { onConflict: 'member_id,order_item_id', ignoreDuplicates: true },
      )
    if (error) {
      console.error('[pickup-checks POST add]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (remove.length > 0) {
    const { error } = await ctx.supabase
      .from('member_pickup_checks')
      .delete()
      .eq('member_id', ctx.user.id)
      .in('order_item_id', remove)
    if (error) {
      console.error('[pickup-checks POST remove]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const listed = await listIds(ctx.supabase, ctx.user.id)
  if ('error' in listed && listed.error) {
    console.error('[pickup-checks POST list]', listed.error)
    return NextResponse.json({ error: listed.error.message }, { status: 500 })
  }

  return NextResponse.json({ itemIds: listed.itemIds ?? [] })
}
