/** Lecture Biopartner : .xlsx (recommandé) ou .csv — même parseur produit. */

import * as XLSX from 'xlsx'
import {
  parseBiopartnerCsv,
  parseBiopartnerGrid,
  type ParsedBiopartnerCsv,
} from '@/lib/import/biopartner-csv'

export function isBiopartnerExcelFilename(filename: string): boolean {
  return /\.xlsx?$/i.test(filename.trim())
}

export function isBiopartnerCsvFilename(filename: string): boolean {
  return /\.csv$/i.test(filename.trim())
}

export function parseBiopartnerXlsx(buffer: ArrayBuffer): ParsedBiopartnerCsv {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  } catch {
    throw new Error(
      'Impossible de lire le fichier Excel. Vérifiez qu\'il s\'agit d\'un .xlsx Biopartner valide.',
    )
  }

  for (const sheetName of workbook.SheetNames) {
    const raw = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
    })
    if (!raw.length) continue

    try {
      return parseBiopartnerGrid(raw)
    } catch {
      continue
    }
  }

  throw new Error(
    'En-têtes Biopartner introuvables dans le fichier Excel. Vérifiez que la feuille contient une ligne « Article » en première colonne.',
  )
}

/** Détecte le format via l’extension et parse le fichier uploadé. */
export async function parseBiopartnerUpload(file: File): Promise<ParsedBiopartnerCsv> {
  const name = file.name.trim()

  if (isBiopartnerExcelFilename(name)) {
    return parseBiopartnerXlsx(await file.arrayBuffer())
  }

  if (isBiopartnerCsvFilename(name)) {
    return parseBiopartnerCsv(await file.text())
  }

  throw new Error(
    'Format non reconnu. Utilisez un fichier .xlsx (recommandé) ou .csv exporté par Biopartner.',
  )
}
