/** Export CSV commandes admin — tri, agrégation, format Joel / Biopartner. */

export type OrderExportInput = {
  status: string
  created_at: string
  member: { full_name: string | null; email: string | null; username: string | null } | null
  supplier: { name: string; type: string } | null
  order_items: Array<{
    quantity: number
    unit_price: number
    product: { name: string; unit: string; supplier_ref: string | null } | null
  }>
}

export type OrderExportRow = {
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

const AGGREGATE_HEADERS = [
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
      rows.push({
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
    const key = `${row.articleRef}\0${row.product}\0${row.unitPrice}\0${row.unit}`
    const existing = map.get(key)
    if (existing) {
      existing.totalQty += row.qty
      existing.totalAmount += row.lineTotal
    } else {
      map.set(key, {
        articleRef: row.articleRef,
        product: row.product,
        unit: row.unit,
        unitPrice: row.unitPrice,
        totalQty: row.qty,
        totalAmount: row.lineTotal,
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

function supplierTypeLabel(type: string, labels: Record<string, string>): string {
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
