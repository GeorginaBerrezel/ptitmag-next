/** Lecture commune .xlsx et .csv (séparateur ;) pour tous les imports admin. */

import * as XLSX from 'xlsx'

export function isExcelFilename(filename: string): boolean {
  return /\.xlsx?$/i.test(filename.trim())
}

export function isCsvFilename(filename: string): boolean {
  return /\.csv$/i.test(filename.trim())
}

/** RFC 4180 — point-virgule par défaut (fichiers suisses). */
export function parseSemicolonCsv(text: string, sep = ';'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  const flush = () => { row.push(field); field = '' }
  const newRow = () => { rows.push(row); row = [] }

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2 }
      else if (ch === '"') { inQuotes = false; i++ }
      else { field += ch; i++ }
    } else {
      if (ch === '"') { inQuotes = true; i++ }
      else if (ch === sep) { flush(); i++ }
      else if (ch === '\r' && text[i + 1] === '\n') { flush(); newRow(); i += 2 }
      else if (ch === '\n') { flush(); newRow(); i++ }
      else { field += ch; i++ }
    }
  }
  if (field || row.length) { flush(); newRow() }

  return rows.filter(r => r.some(c => c.trim()))
}

function cellToGridString(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value)
    return value.toString()
  }
  return String(value).trim()
}

export function gridFromXlsxBuffer(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
  return raw.map(row =>
    (Array.isArray(row) ? row : []).map(cellToGridString),
  )
}

export function workbookFromBuffer(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array', cellDates: false })
}

/** Première feuille → grille de textes (import fournisseur simple ou dédié). */
export async function readUploadAsGrid(file: File): Promise<string[][]> {
  const name = file.name.trim()
  if (isExcelFilename(name)) {
    return gridFromXlsxBuffer(await file.arrayBuffer())
  }
  if (isCsvFilename(name)) {
    return parseSemicolonCsv(await file.text())
  }
  throw new Error('Format non reconnu. Utilisez un fichier .xlsx ou .csv.')
}
