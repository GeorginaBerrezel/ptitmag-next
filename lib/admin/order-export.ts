/** Export CSV commandes admin — tri, agrégation, format Joel / Biopartner. */

import { roundChf } from '@/lib/members/credit'

export type OrderExportInput = {
  status: string
  created_at: string
  total?: number
  credit_applied?: number | null
  member: { full_name: string | null; email: string | null; username: string | null } | null
  supplier: { name: string; type: string } | null
  order_items: Array<{
    id?: string
    quantity: number
    unit_price: number
    cancelled_at?: string | null
    product: { name: string; unit: string; supplier_ref: string | null } | null
  }>
}

export type OrderExportRow = {
  orderItemId: string
  articleRef: string
  product: string
  qty: number
  unit: string
  unitPrice: number
  lineTotal: number
  supplier: string
  supplierType: string
  member: string
  email: string
  dateLabel: string
  createdAtIso: string
}

export type AggregatedExportLine = {
  articleRef: string
  product: string
  unit: string
  unitPrice: number
  totalQty: number
  totalAmount: number
  orderItemIds: string[]
}

export type OrderFinancialSummary = {
  supplier: string
  member: string
  email: string
  dateLabel: string
  status: string
  grossTotal: number
  creditApplied: number
  finalTotal: number
}

const BIOPARTNER_SUFFIX_ORDER = [
  'Général',
  'Grands emballages',
  'Surgelés',
  'Viandes fraîches',
]

export const EXPORT_HEADERS = [
  'N° article',
  'Désignation',
  'Quantité commandée',
  'Prix à la pièce (CHF)',
  'Total (CHF)',
  'Fournisseur',
  'Type',
  'Membre',
  'Email',
  'Date commande',
  'Unité',
] as const

export const AGGREGATE_HEADERS = [
  'N° article',
  'Désignation',
  'Quantité totale',
  'Unité',
  'Prix à la pièce (CHF)',
  'Total (CHF)',
] as const

export function csvCell(value: string | number): string {
  const s = String(value)
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function compareArticleRef(a: string, b: string): number {
  const na = Number.parseInt(a, 10)
  const nb = Number.parseInt(b, 10)
  const aNum = a !== '' && !Number.isNaN(na)
  const bNum = b !== '' && !Number.isNaN(nb)
  if (aNum && bNum) return na - nb
  if (aNum && !bNum) return -1
  if (!aNum && bNum) return 1
  return a.localeCompare(b, 'fr', { sensitivity: 'base' })
}

export function supplierSortKey(name: string): string {
  const prefix = 'Biopartner – '
  if (name.startsWith(prefix)) {
    const suffix = name.slice(prefix.length)
    const idx = BIOPARTNER_SUFFIX_ORDER.indexOf(suffix)
    return `0-${String(idx >= 0 ? idx : 99).padStart(2, '0')}-${suffix}`
  }
  return `1-${name.toLocaleLowerCase('fr')}`
}

export function sortSupplierNames(names: string[]): string[] {
  return [...names].sort((a, b) => supplierSortKey(a).localeCompare(supplierSortKey(b), 'fr'))
}

export function sortExportRows(rows: OrderExportRow[]): OrderExportRow[] {
  return [...rows].sort((a, b) => {
    const byArticle = compareArticleRef(a.articleRef, b.articleRef)
    if (byArticle !== 0) return byArticle
    const byProduct = a.product.localeCompare(b.product, 'fr', { sensitivity: 'base' })
    if (byProduct !== 0) return byProduct
    const byMember = a.member.localeCompare(b.member, 'fr', { sensitivity: 'base' })
    if (byMember !== 0) return byMember
    return a.createdAtIso.localeCompare(b.createdAtIso)
  })
}

export function collectExportRows(
  orders: OrderExportInput[],
  getMemberName: (order: OrderExportInput) => string,
  formatDate: (iso: string) => string,
): OrderExportRow[] {
  const rows: OrderExportRow[] = []

  for (const order of orders) {
    if (order.status === 'cancelled') continue

    const supplier = order.supplier?.name ?? 'Inconnu'
    const supplierType = order.supplier?.type ?? ''

    for (const item of order.order_items) {
      if (item.cancelled_at) continue
      const orderItemId = item.id?.trim()
      if (!orderItemId) continue

      rows.push({
        orderItemId,
        articleRef: item.product?.supplier_ref?.trim() ?? '',
        product: item.product?.name ?? '—',
        qty: item.quantity,
        unit: item.product?.unit ?? '',
        unitPrice: item.unit_price,
        lineTotal: item.quantity * item.unit_price,
        supplier,
        supplierType,
        member: getMemberName(order),
        email: order.member?.email ?? '',
        dateLabel: formatDate(order.created_at),
        createdAtIso: order.created_at,
      })
    }
  }

  return rows
}

export function groupRowsBySupplier(rows: OrderExportRow[]): Map<string, OrderExportRow[]> {
  const map = new Map<string, OrderExportRow[]>()
  for (const row of rows) {
    const list = map.get(row.supplier) ?? []
    list.push(row)
    map.set(row.supplier, list)
  }
  for (const [name, list] of map) {
    map.set(name, sortExportRows(list))
  }
  return map
}

export function aggregateExportRows(rows: OrderExportRow[]): AggregatedExportLine[] {
  const map = new Map<string, AggregatedExportLine>()

  for (const row of rows) {
    const ref = row.articleRef.trim()
    const key = ref ? `ref:${ref}` : `name:${row.product}\0${row.unit}`
    const existing = map.get(key)
    if (existing) {
      existing.totalQty += row.qty
      existing.totalAmount = roundChf(existing.totalAmount + row.lineTotal)
      existing.orderItemIds.push(row.orderItemId)
      if (existing.totalQty > 0) {
        existing.unitPrice = roundChf(existing.totalAmount / existing.totalQty)
      }
      if (!existing.product && row.product) existing.product = row.product
      if (!existing.unit && row.unit) existing.unit = row.unit
      if (!existing.articleRef && ref) existing.articleRef = ref
    } else {
      map.set(key, {
        articleRef: ref,
        product: row.product,
        unit: row.unit,
        unitPrice: row.unitPrice,
        totalQty: row.qty,
        totalAmount: row.lineTotal,
        orderItemIds: [row.orderItemId],
      })
    }
  }

  return [...map.values()].sort((a, b) => {
    const byArticle = compareArticleRef(a.articleRef, b.articleRef)
    if (byArticle !== 0) return byArticle
    return a.product.localeCompare(b.product, 'fr', { sensitivity: 'base' })
  })
}

function aggregateRowToCsv(line: AggregatedExportLine): string {
  return [
    csvCell(line.articleRef),
    csvCell(line.product),
    line.totalQty,
    csvCell(line.unit),
    line.unitPrice.toFixed(2),
    line.totalAmount.toFixed(2),
  ].join(';')
}

function detailRowToCsv(row: OrderExportRow, supplierTypeLabel: string): string {
  return [
    csvCell(row.articleRef),
    csvCell(row.product),
    row.qty,
    row.unitPrice.toFixed(2),
    row.lineTotal.toFixed(2),
    csvCell(row.supplier),
    csvCell(supplierTypeLabel),
    csvCell(row.member),
    csvCell(row.email),
    csvCell(row.dateLabel),
    csvCell(row.unit),
  ].join(';')
}

export function supplierTypeLabel(type: string, labels: Record<string, string>): string {
  return labels[type] ?? type
}

export function buildOrdersCsv(options: {
  rows: OrderExportRow[]
  supplierTypeLabels: Record<string, string>
  singleSupplier?: string
}): string {
  const { rows, supplierTypeLabels, singleSupplier } = options
  const bySupplier = groupRowsBySupplier(rows)
  const supplierNames = singleSupplier
    ? [singleSupplier]
    : sortSupplierNames([...bySupplier.keys()])

  const lines: string[] = []

  for (const supplierName of supplierNames) {
    const supplierRows = bySupplier.get(supplierName)
    if (!supplierRows?.length) continue

    const typeLabel = supplierTypeLabel(supplierRows[0].supplierType, supplierTypeLabels)
    const supplierTotal = supplierRows.reduce((s, r) => s + r.lineTotal, 0)
    const aggregated = aggregateExportRows(supplierRows)
    const aggregateTotal = aggregated.reduce((s, r) => s + r.totalAmount, 0)

    lines.push('')
    lines.push(csvCell(`═══ ${supplierName} — ${typeLabel} ═══`))
    lines.push('')

    lines.push('Récapitulatif groupé (à envoyer au fournisseur)')
    lines.push(AGGREGATE_HEADERS.join(';'))
    for (const line of aggregated) {
      lines.push(aggregateRowToCsv(line))
    }
    lines.push([
      '',
      csvCell(`TOTAL ${supplierName}`),
      '', '', '',
      aggregateTotal.toFixed(2),
    ].join(';'))

    lines.push('')
    lines.push('Détail par membre')
    lines.push(EXPORT_HEADERS.join(';'))
    for (const row of supplierRows) {
      lines.push(detailRowToCsv(row, typeLabel))
    }
    lines.push([
      '',
      csvCell(`TOTAL détail ${supplierName}`),
      '', '',
      supplierTotal.toFixed(2),
      '', '', '', '', '', '',
    ].join(';'))
  }

  if (lines.length === 0) return EXPORT_HEADERS.join(';')

  // Première ligne = en-tête globale si un seul bloc sans titre initial
  return lines.join('\n').trimStart()
}

export function computeAggregatedSummary(
  orders: OrderExportInput[],
  getMemberName: (order: OrderExportInput) => string,
  formatDate: (iso: string) => string,
): AggregatedExportLine[] {
  const rows = collectExportRows(orders, getMemberName, formatDate)
  return aggregateExportRows(rows)
}

export function collectOrderFinancialSummaries(
  orders: OrderExportInput[],
  getMemberName: (order: OrderExportInput) => string,
  formatDate: (iso: string) => string,
): OrderFinancialSummary[] {
  return orders
    .filter(o => o.status !== 'cancelled')
    .map(order => {
      const activeItems = order.order_items.filter(i => !i.cancelled_at)
      const grossTotal = roundChf(
        activeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0),
      )
      const creditApplied = roundChf(Number(order.credit_applied) || 0)
      const finalTotal = roundChf(Number(order.total) ?? grossTotal - creditApplied)

      return {
        supplier: order.supplier?.name ?? 'Inconnu',
        member: getMemberName(order),
        email: order.member?.email ?? '',
        dateLabel: formatDate(order.created_at),
        status: order.status,
        grossTotal,
        creditApplied,
        finalTotal,
      }
    })
}
