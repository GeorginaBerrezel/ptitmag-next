import { createClient } from '@/lib/supabase/server'
import { buildMemberOrderExportCsv } from '@/lib/member/order-export'
import type { OrderWithItems } from '@/lib/supabase/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, total, created_at,
      supplier:suppliers(name, type),
      order_items(
        id, quantity, unit_price, cancelled_at,
        product:products(name, unit)
      )
    `)
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const orders = (data ?? []).map(order => {
    const raw = order as unknown as OrderWithItems
    return {
      ...raw,
      order_items: raw.order_items.filter(i => !i.cancelled_at),
    }
  })

  const csv = buildMemberOrderExportCsv(orders)
  const filename = `mes-commandes-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
