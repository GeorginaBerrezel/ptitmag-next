import ExcelJS from 'exceljs'
import type { AnnualSummary } from '@/lib/admin/annual-report'

const STYLE = {
  titleFont: { bold: true, size: 14, color: { argb: 'FF1A1A2E' } },
  sectionFont: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
  sectionFill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1A1A2E' } },
  headerFont: { bold: true, size: 10, color: { argb: 'FF444444' } },
  headerFill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF5F5F5' } },
  money: '#,##0.00',
}

function styleRow(row: ExcelJS.Row, font?: Partial<ExcelJS.Font>, fill?: ExcelJS.Fill) {
  row.eachCell({ includeEmpty: true }, cell => {
    if (font) cell.font = { ...cell.font, ...font }
    if (fill) cell.fill = fill
  })
}

function addSectionHeader(sheet: ExcelJS.Worksheet, rowIdx: number, title: string, colSpan: number) {
  sheet.mergeCells(rowIdx, 1, rowIdx, colSpan)
  const row = sheet.getRow(rowIdx)
  row.getCell(1).value = title
  styleRow(row, STYLE.sectionFont, STYLE.sectionFill)
  row.height = 22
  return rowIdx + 1
}

function addTableHeader(sheet: ExcelJS.Worksheet, rowIdx: number, headers: string[]) {
  const row = sheet.getRow(rowIdx)
  headers.forEach((h, i) => { row.getCell(i + 1).value = h })
  styleRow(row, STYLE.headerFont, STYLE.headerFill)
  return rowIdx + 1
}

export async function buildAnnualReportExcelBuffer(summary: AnnualSummary): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Le p'tit mag"
  const sheet = workbook.addWorksheet(`Bilan ${summary.year}`, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ]

  let rowIdx = 1

  const titleRow = sheet.getRow(rowIdx++)
  titleRow.getCell(1).value = `Bilan annuel ${summary.year} — Le p'tit mag`
  styleRow(titleRow, STYLE.titleFont)
  rowIdx++

  rowIdx = addSectionHeader(sheet, rowIdx, 'Synthèse', 2)
  rowIdx = addTableHeader(sheet, rowIdx, ['Indicateur', 'Valeur'])

  const synthRows: Array<[string, string | number]> = [
    ['Commandes (total)', summary.totalOrders],
    ['Confirmées', summary.confirmedOrders],
    ['Livrées', summary.deliveredOrders],
    ['Annulées', summary.cancelledOrders],
    ['Chiffre d\'affaires (CHF)', summary.revenue],
  ]

  for (const [label, value] of synthRows) {
    const row = sheet.getRow(rowIdx++)
    row.getCell(1).value = label
    row.getCell(2).value = value
    if (label.includes('CHF')) row.getCell(2).numFmt = STYLE.money
  }

  rowIdx++

  rowIdx = addSectionHeader(sheet, rowIdx, 'Par fournisseur', 3)
  rowIdx = addTableHeader(sheet, rowIdx, ['Fournisseur', 'Commandes', 'CA (CHF)'])
  for (const row of summary.bySupplier) {
    const r = sheet.getRow(rowIdx++)
    r.getCell(1).value = row.name
    r.getCell(2).value = row.count
    r.getCell(3).value = row.revenue
    r.getCell(3).numFmt = STYLE.money
  }

  rowIdx++

  rowIdx = addSectionHeader(sheet, rowIdx, 'Par mois', 3)
  rowIdx = addTableHeader(sheet, rowIdx, ['Mois', 'Commandes', 'CA (CHF)'])
  for (const row of summary.byMonth) {
    const r = sheet.getRow(rowIdx++)
    r.getCell(1).value = row.label
    r.getCell(2).value = row.count
    r.getCell(3).value = row.revenue
    r.getCell(3).numFmt = STYLE.money
  }

  rowIdx++

  rowIdx = addSectionHeader(sheet, rowIdx, 'Top 50 produits', 5)
  rowIdx = addTableHeader(sheet, rowIdx, ['N° article', 'Désignation', 'Unité', 'Qté totale', 'CA (CHF)'])
  for (const row of summary.topProducts) {
    const r = sheet.getRow(rowIdx++)
    r.getCell(1).value = row.ref || '—'
    r.getCell(2).value = row.name
    r.getCell(3).value = row.unit
    r.getCell(4).value = row.totalQty
    r.getCell(5).value = row.totalAmount
    r.getCell(5).numFmt = STYLE.money
  }

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>
}
