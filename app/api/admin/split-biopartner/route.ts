import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'
import { BIOPARTNER_CATALOGS } from '@/lib/import/biopartner-catalogs'
import { buildBiopartnerCsvFile, parseBiopartnerCsv } from '@/lib/import/biopartner-csv'
import { splitBiopartnerRows } from '@/lib/import/biopartner-split'

/**
 * POST — Découpe un gros CSV Biopartner en 4 fichiers (heuristique).
 * Retourne les CSV + compteurs pour validation avant import.
 */
export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Accès réservé à l\'administrateur.' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })
  }

  let parsed
  try {
    parsed = parseBiopartnerCsv(await file.text())
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: 'Aucun produit trouvé dans le fichier.' }, { status: 400 })
  }

  const split = splitBiopartnerRows(parsed.rows)

  const counts: Record<string, number> = {}
  const files: Record<string, string> = {}

  for (const catalog of BIOPARTNER_CATALOGS) {
    const rows = split[catalog.key]
    counts[catalog.key] = rows.length
    files[catalog.importKey] = buildBiopartnerCsvFile(parsed, rows)
  }

  return NextResponse.json({
    success: true,
    totalRows: parsed.rows.length,
    counts: Object.fromEntries(
      BIOPARTNER_CATALOGS.map(c => [c.importKey, counts[c.key]]),
    ),
    labels: Object.fromEntries(
      BIOPARTNER_CATALOGS.map(c => [c.importKey, c.name]),
    ),
    files,
    message: `${parsed.rows.length} lignes réparties en 4 catalogues. Vérifiez les compteurs avant d'importer chaque fichier.`,
  })
}
