import ExcelJS from 'exceljs'
import {
  AGGREGATE_HEADERS,
  EXPORT_HEADERS,
  aggregateExportRows,
  groupRowsBySupplier,
  sortSupplierNames,
  supplierTypeLabel,
  type OrderExportRow,
  type OrderFinancialSummary,
} from '@/lib/admin/order-export'

const COL_COUNT = EXPORT_HEADERS.length
const AGG_COL_COUNT = AGGREGATE_HEADERS.length

const STYLE = {
  sectionFont: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
  sectionFill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1A1A2E' } },
  subtitleFont: { bold: true, size: 11, color: { argb: 'FF2E7D32' } },
  subtitleFill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8F5E9' } },
  headerFont: { bold: true, size: 10, color: { argb: 'FF444444' } },
  headerFill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF5F5F5' } },
  totalFont: { bold: true, size: 10, color: { argb: 'FF1A1A2E' } },
  totalFill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF8E6' } },
  money: '#,##0.00',
}

function applyRowStyle(row: ExcelJS.Row, font?: Partial<ExcelJS.Font>, fill?: ExcelJS.Fill) {
  row.eachCell({ includeEmpty: true }, cell => {
    if (font) cell.font = { ...cell.font, ...font }
    if (fill) cell.fill = fill
  })
}

function setMoneyFormat(row: ExcelJS.Row, cols: number[]) {
  for (const col of cols) {
    row.getCell(col).numFmt = STYLE.money
  }
}

export async function buildOrdersExcelBuffer(options: {
  rows: OrderExportRow[]
  supplierTypeLabels: Record<string, string>
  singleSupplier?: string
  financialSummaries?: OrderFinancialSummary[]
}): Promise<ArrayBuffer> {
  const { rows, supplierTypeLabels, singleSupplier, financialSummaries = [] } = options
  const bySupplier = groupRowsBySupplier(rows)
  const supplierNames = singleSupplier
    ? [singleSupplier]
    : sortSupplierNames([...bySupplier.keys()])

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Le p'tit mag"
  const sheet = workbook.addWorksheet('Commandes', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { width: 14 },
    { width: 42 },
    { width: 12 },
    { width: 16 },
    { width: 14 },
    { width: 28 },
    { width: 16 },
    { width: 20 },
    { width: 28 },
    { width: 16 },
    { width: 14 },
  ]

  let rowIdx = 1

  for (const supplierName of supplierNames) {
    const supplierRows = bySupplier.get(supplierName)
    if (!supplierRows?.length) continue

    const typeLabel = supplierTypeLabel(supplierRows[0].supplierType, supplierTypeLabels)
    const supplierTotal = supplierRows.reduce((s, r) => s + r.lineTotal, 0)
    const aggregated = aggregateExportRows(supplierRows)
    const aggregateTotal = aggregated.reduce((s, r) => s + r.totalAmount, 0)

    if (rowIdx > 1) rowIdx += 1

    // Titre fournisseur
    sheet.mergeCells(rowIdx, 1, rowIdx, COL_COUNT)
    const titleRow = sheet.getRow(rowIdx)
    titleRow.getCell(1).value = `${supplierName} — ${typeLabel}`
    titleRow.height = 24
    applyRowStyle(titleRow, STYLE.sectionFont, STYLE.sectionFill)
    rowIdx += 1

    // Sous-titre récap
    sheet.mergeCells(rowIdx, 1, rowIdx, AGG_COL_COUNT)
    const recapTitleRow = sheet.getRow(rowIdx)
    recapTitleRow.getCell(1).value = 'Récapitulatif groupé — à envoyer au fournisseur'
    applyRowStyle(recapTitleRow, STYLE.subtitleFont, STYLE.subtitleFill)
    rowIdx += 1

    // En-têtes récap
    const aggHeaderRow = sheet.getRow(rowIdx)
    AGGREGATE_HEADERS.forEach((h, i) => { aggHeaderRow.getCell(i + 1).value = h })
    applyRowStyle(aggHeaderRow, STYLE.headerFont, STYLE.headerFill)
    rowIdx += 1

    // Lignes récap
    for (const line of aggregated) {
      const r = sheet.getRow(rowIdx)
      r.getCell(1).value = line.articleRef || ''
      r.getCell(2).value = line.product
      r.getCell(3).value = line.totalQty
      r.getCell(4).value = line.unit
      r.getCell(5).value = line.unitPrice
      r.getCell(6).value = line.totalAmount
      setMoneyFormat(r, [5, 6])
      rowIdx += 1
    }

    // Total récap
    const aggTotalRow = sheet.getRow(rowIdx)
    aggTotalRow.getCell(2).value = `TOTAL ${supplierName}`
    aggTotalRow.getCell(6).value = aggregateTotal
    setMoneyFormat(aggTotalRow, [6])
    applyRowStyle(aggTotalRow, STYLE.totalFont, STYLE.totalFill)
    rowIdx += 2

    // Sous-titre détail
    sheet.mergeCells(rowIdx, 1, rowIdx, COL_COUNT)
    const detailTitleRow = sheet.getRow(rowIdx)
    detailTitleRow.getCell(1).value = 'Détail par membre'
    applyRowStyle(detailTitleRow, STYLE.subtitleFont, STYLE.subtitleFill)
    rowIdx += 1

    // En-têtes détail
    const detailHeaderRow = sheet.getRow(rowIdx)
    EXPORT_HEADERS.forEach((h, i) => { detailHeaderRow.getCell(i + 1).value = h })
    applyRowStyle(detailHeaderRow, STYLE.headerFont, STYLE.headerFill)
    rowIdx += 1

    // Lignes détail
    for (const row of supplierRows) {
      const r = sheet.getRow(rowIdx)
      r.getCell(1).value = row.articleRef || ''
      r.getCell(2).value = row.product
      r.getCell(3).value = row.qty
      r.getCell(4).value = row.unitPrice
      r.getCell(5).value = row.lineTotal
      r.getCell(6).value = row.supplier
      r.getCell(7).value = typeLabel
      r.getCell(8).value = row.member
      r.getCell(9).value = row.email
      r.getCell(10).value = row.dateLabel
      r.getCell(11).value = row.unit
      setMoneyFormat(r, [4, 5])
      rowIdx += 1
    }

    // Total détail
    const detailTotalRow = sheet.getRow(rowIdx)
    detailTotalRow.getCell(2).value = `TOTAL détail ${supplierName}`
    detailTotalRow.getCell(5).value = supplierTotal
    setMoneyFormat(detailTotalRow, [5])
    applyRowStyle(detailTotalRow, STYLE.totalFont, STYLE.totalFill)
    rowIdx += 1

    const supplierFinancials = financialSummaries.filter(s => s.supplier === supplierName)
    const hasCredit = supplierFinancials.some(s => s.creditApplied > 0)

    if (hasCredit && supplierFinancials.length > 0) {
      rowIdx += 1
      sheet.mergeCells(rowIdx, 1, rowIdx, COL_COUNT)
      const finTitleRow = sheet.getRow(rowIdx)
      finTitleRow.getCell(1).value = 'Montants par commande (sous-total → avoir → total final)'
      applyRowStyle(finTitleRow, STYLE.subtitleFont, STYLE.subtitleFill)
      rowIdx += 1

      const finHeaderRow = sheet.getRow(rowIdx)
      const finHeaders = ['Membre', 'Date', 'Statut', 'Sous-total (CHF)', 'Avoir déduit (CHF)', 'Total final (CHF)']
      finHeaders.forEach((h, i) => { finHeaderRow.getCell(i + 1).value = h })
      applyRowStyle(finHeaderRow, STYLE.headerFont, STYLE.headerFill)
      rowIdx += 1

      for (const fin of supplierFinancials) {
        const r = sheet.getRow(rowIdx)
        r.getCell(1).value = fin.member
        r.getCell(2).value = fin.dateLabel
        r.getCell(3).value = fin.status
        r.getCell(4).value = fin.grossTotal
        r.getCell(5).value = fin.creditApplied
        r.getCell(6).value = fin.finalTotal
        setMoneyFormat(r, [4, 5, 6])
        rowIdx += 1
      }
    }
  }

  if (rowIdx === 1) {
    const empty = sheet.getRow(1)
    EXPORT_HEADERS.forEach((h, i) => { empty.getCell(i + 1).value = h })
    applyRowStyle(empty, STYLE.headerFont, STYLE.headerFill)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}
