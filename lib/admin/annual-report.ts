/** Bilan annuel — agrégations pour l'association. */

export type AnnualReportOrder = {
  id: string
  status: string
  total: number
  created_at: string
  supplier: { name: string } | null
  order_items: Array<{
    quantity: number
    unit_price: number
    cancelled_at?: string | null
    product: { name: string; unit: string; supplier_ref: string | null } | null
  }>
}

export type AnnualSupplierRow = {
  name: string
  count: number
  revenue: number
}

export type AnnualMonthRow = {
  month: string
  label: string
  count: number
  revenue: number
}

export type AnnualProductRow = {
  ref: string
  name: string
  unit: string
  totalQty: number
  totalAmount: number
}

export type AnnualSummary = {
  year: number
  totalOrders: number
  confirmedOrders: number
  deliveredOrders: number
  cancelledOrders: number
  revenue: number
  bySupplier: AnnualSupplierRow[]
  byMonth: AnnualMonthRow[]
  topProducts: AnnualProductRow[]
}

function orderYear(iso: string): number {
  return new Date(iso).getFullYear()
}

function activeItems(order: AnnualReportOrder) {
  return order.order_items.filter(i => !i.cancelled_at)
}

export function filterOrdersForYear(orders: AnnualReportOrder[], year: number): AnnualReportOrder[] {
  return orders.filter(o => orderYear(o.created_at) === year)
}

export function computeAnnualSummary(orders: AnnualReportOrder[], year: number): AnnualSummary {
  const yearOrders = filterOrdersForYear(orders, year)
  const nonCancelled = yearOrders.filter(o => o.status !== 'cancelled')

  const bySupplierMap = new Map<string, { count: number; revenue: number }>()
  for (const order of nonCancelled) {
    const name = order.supplier?.name ?? '—'
    const prev = bySupplierMap.get(name) ?? { count: 0, revenue: 0 }
    bySupplierMap.set(name, {
      count: prev.count + 1,
      revenue: prev.revenue + order.total,
    })
  }

  const byMonth: AnnualMonthRow[] = Array.from({ length: 12 }, (_, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
    const monthOrders = nonCancelled.filter(o => o.created_at.startsWith(monthKey))
    const d = new Date(year, i, 1)
    return {
      month: monthKey,
      label: d.toLocaleDateString('fr-CH', { month: 'long' }),
      count: monthOrders.length,
      revenue: monthOrders.reduce((s, o) => s + o.total, 0),
    }
  })

  const productMap = new Map<string, AnnualProductRow>()
  for (const order of nonCancelled) {
    for (const item of activeItems(order)) {
      const ref = item.product?.supplier_ref ?? ''
      const name = item.product?.name ?? '—'
      const unit = item.product?.unit ?? ''
      const key = `${ref}::${name}::${unit}`
      const lineTotal = item.quantity * item.unit_price
      const prev = productMap.get(key)
      if (prev) {
        prev.totalQty += item.quantity
        prev.totalAmount += lineTotal
      } else {
        productMap.set(key, {
          ref,
          name,
          unit,
          totalQty: item.quantity,
          totalAmount: lineTotal,
        })
      }
    }
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 50)

  return {
    year,
    totalOrders: yearOrders.length,
    confirmedOrders: yearOrders.filter(o => o.status === 'confirmed').length,
    deliveredOrders: yearOrders.filter(o => o.status === 'delivered').length,
    cancelledOrders: yearOrders.filter(o => o.status === 'cancelled').length,
    revenue: nonCancelled.reduce((s, o) => s + o.total, 0),
    bySupplier: [...bySupplierMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue),
    byMonth,
    topProducts,
  }
}

export function availableReportYears(orders: AnnualReportOrder[]): number[] {
  const years = new Set<number>()
  for (const order of orders) {
    years.add(orderYear(order.created_at))
  }
  return [...years].sort((a, b) => b - a)
}
