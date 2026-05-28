import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { HEBDO_SHEET_CONFIG, parseLocalSheet } from '@/lib/import/local-suppliers'
import { upsertLocalSupplier } from '@/lib/import/upsert-local'
import { requireAdminUser } from '@/lib/admin/auth'

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 })

  const admin = createAdminClient()
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const dateLimiteMercredi = (formData.get('date_limite_mercredi') as string | null)?.trim() || null
  const dateLimiteJeudi    = (formData.get('date_limite_jeudi')    as string | null)?.trim() || null

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: "Impossible de lire le fichier Excel. Assurez-vous que c'est un fichier .xlsx valide." }, { status: 400 })
  }

  const globalStats = {
    sheetsProcessed: 0,
    productsImported: 0,
    productsInserted: 0,
    productsUpdated: 0,
    errors: [] as string[],
  }
  const sheetResults: Record<string, { count: number; supplierName: string }> = {}

  for (const sheetName of workbook.SheetNames) {
    const config = HEBDO_SHEET_CONFIG[sheetName]
    if (!config) continue

    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' })
    const parsed = parseLocalSheet(rows, config.category)

    if (parsed.length === 0) {
      globalStats.errors.push(`${sheetName} : aucun produit trouvé.`)
      continue
    }

    const deadline = config.deadlineGroup === 'mercredi' ? dateLimiteMercredi : dateLimiteJeudi
    const { count, inserted, updated, error } = await upsertLocalSupplier(admin, config, parsed, deadline)

    if (error) { globalStats.errors.push(`${sheetName} : ${error}`); continue }

    globalStats.sheetsProcessed++
    globalStats.productsImported += count
    globalStats.productsInserted += inserted
    globalStats.productsUpdated += updated
    sheetResults[sheetName] = { count, supplierName: config.supplierName }
  }

  const message = globalStats.sheetsProcessed === 0
    ? 'Aucun onglet reconnu dans ce fichier.'
    : `${globalStats.sheetsProcessed} fournisseur${globalStats.sheetsProcessed > 1 ? 's' : ''} importé${globalStats.sheetsProcessed > 1 ? 's' : ''} — ${globalStats.productsImported} produits au total.`

  return NextResponse.json({
    success: globalStats.sheetsProcessed > 0,
    message,
    stats: {
      productsCreated: globalStats.productsInserted,
      productsUpdated: globalStats.productsUpdated,
      errors: globalStats.errors.length,
      sheetResults,
      importStrategy: 'upsert' as const,
    },
    errors: globalStats.errors,
  })
}
