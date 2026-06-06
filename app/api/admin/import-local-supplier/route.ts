import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import {
  LOCAL_SUPPLIER_CONFIG,
  parseBioterroirNumericRows,
  parseLocalSheet,
} from '@/lib/import/local-suppliers'
import { tryParseSimpleCatalogGrid } from '@/lib/import/simple-catalog-fallback'
import { readUploadAsGrid, isExcelFilename, workbookFromBuffer, isCsvFilename } from '@/lib/import/spreadsheet-file'
import { upsertLocalSupplier } from '@/lib/import/upsert-local'
import { requireAdminUser } from '@/lib/admin/auth'
import * as XLSX from 'xlsx'

// FormData : file (.xlsx ou .csv), supplier, date_limite_commande (optionnel)

function parseLocalFromRows(
  rows: unknown[][],
  supplierKey: string,
  defaultCategory: string,
) {
  let result = parseLocalSheet(rows, defaultCategory)
  if (result.length === 0 && supplierKey === 'bioterroir') {
    result = parseBioterroirNumericRows(rows, defaultCategory)
  }
  return result
}

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 })

  const admin = createAdminClient()
  const formData = await request.formData()

  const file        = formData.get('file') as File | null
  const supplierKey = (formData.get('supplier') as string | null)?.trim().toLowerCase()
  const dateLimite  = (formData.get('date_limite_commande') as string | null)?.trim() || null

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })

  const config = supplierKey ? LOCAL_SUPPLIER_CONFIG[supplierKey] : undefined
  if (!config) {
    return NextResponse.json({
      error: `Fournisseur inconnu : "${supplierKey}". Valeurs acceptées : ${Object.keys(LOCAL_SUPPLIER_CONFIG).join(', ')}`,
    }, { status: 400 })
  }

  let parsed: ReturnType<typeof parseLocalSheet> = []

  try {
    if (isCsvFilename(file.name)) {
      const grid = await readUploadAsGrid(file)
      parsed = parseLocalFromRows(grid, supplierKey!, config.category)
      if (parsed.length === 0) {
        parsed = tryParseSimpleCatalogGrid(grid, config.category) ?? []
      }
    } else if (isExcelFilename(file.name)) {
      const workbook = workbookFromBuffer(await file.arrayBuffer())
      for (const sheetName of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' })
        const result = parseLocalFromRows(rows, supplierKey!, config.category)
        if (result.length > 0) {
          parsed = result
          break
        }
      }
      if (parsed.length === 0) {
        const grid = await readUploadAsGrid(file)
        parsed = tryParseSimpleCatalogGrid(grid, config.category) ?? []
      }
    } else {
      return NextResponse.json({ error: 'Format non reconnu. Utilisez .xlsx ou .csv.' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (parsed.length === 0) {
    return NextResponse.json({
      error: 'Aucun produit trouvé. Utilisez le format « Produit / Prix / Unité » ou le gabarit simple nom;prix (voir Guide colonnes).',
    }, { status: 400 })
  }

  const { count, inserted, updated, duplicatesMerged, error } = await upsertLocalSupplier(admin, config, parsed, dateLimite)

  if (error) return NextResponse.json({ error }, { status: 500 })

  const dupNote =
    duplicatesMerged > 0
      ? ` ${duplicatesMerged} ligne${duplicatesMerged > 1 ? 's' : ''} en double dans le fichier (même nom) — la dernière a été gardée.`
      : ''

  return NextResponse.json({
    success: true,
    message: `${config.supplierName} — ${count} produit${count > 1 ? 's' : ''} synchronisé${count > 1 ? 's' : ''} (${inserted} nouveau${inserted > 1 ? 'x' : ''}, ${updated} mis à jour).${dupNote} Les produits absents du fichier restent en base — masquez-les dans Fournisseurs si besoin.`,
    stats: {
      productsCreated: inserted,
      productsUpdated: updated,
      errors: 0,
      importStrategy: 'upsert' as const,
    },
    errors: [],
  })
}
