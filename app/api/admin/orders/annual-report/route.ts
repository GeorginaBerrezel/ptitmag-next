import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminUser } from '@/lib/admin/auth'
import {
  availableReportYears,
  computeAnnualSummary,
  type AnnualReportOrder,
} from '@/lib/admin/annual-report'
import { buildAnnualReportExcelBuffer } from '@/lib/admin/annual-report-xlsx'
import { NextResponse, type NextRequest } from 'next/server'

async function fetchAllOrdersForReport(admin: ReturnType<typeof createAdminClient>) {
  const PAGE = 1000
  const selectPayload = `
    id, status, total, created_at, archived_at,
    supplier:suppliers(name),
    order_items(
      quantity, unit_price, cancelled_at,
      product:products(name, unit, supplier_ref)
    )
  `

  const orders: Record<string, unknown>[] = []
  let from = 0
  for (;;) {
    const { data: batch, error } = await admin
      .from('orders')
      .select(selectPayload)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(error.message)

    const chunk = batch ?? []
    orders.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }

  return orders.map(order => {
    const raw = order as unknown as AnnualReportOrder & { order_items: Array<{ cancelled_at?: string | null }> }
    return {
      ...raw,
      order_items: raw.order_items.filter(i => !i.cancelled_at),
    }
  })
}

/**
 * GET /api/admin/orders/annual-report?year=2026
 * Sans year : liste des années disponibles (JSON).
 */
export async function GET(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const yearParam = request.nextUrl.searchParams.get('year')

  try {
    const orders = await fetchAllOrdersForReport(admin)

    if (!yearParam) {
      return NextResponse.json({ years: availableReportYears(orders) })
    }

    const year = Number.parseInt(yearParam, 10)
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Année invalide.' }, { status: 400 })
    }

    const summary = computeAnnualSummary(orders, year)
    const buffer = await buildAnnualReportExcelBuffer(summary)
    const filename = `bilan-annuel-${year}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[admin/orders/annual-report]', err)
    return NextResponse.json({ error: 'Impossible de générer le bilan.' }, { status: 500 })
  }
}
