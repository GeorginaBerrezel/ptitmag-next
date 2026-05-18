import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { LOCAL_SUPPLIER_CONFIG, parseLocalSheet } from '@/lib/import/local-suppliers'
import { upsertLocalSupplier } from '@/lib/import/upsert-local'

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL ?? 'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
]

// ─── POST — importer un fichier xlsx individuel d'un fournisseur local ────────
//
// FormData attendu :
//   file               : fichier .xlsx
//   supplier           : clé du fournisseur (bioterroir, graines_avenir, truffes…)
//   date_limite        : datetime ISO optionnel

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 })
  }

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

  // Lire le fichier Excel
  const buffer = Buffer.from(await file.arrayBuffer())
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: "Impossible de lire le fichier Excel. Vérifiez que c'est un fichier .xlsx valide." }, { status: 400 })
  }

  // Prendre le premier onglet avec des données
  let parsed: ReturnType<typeof parseLocalSheet> = []
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' })
    const result = parseLocalSheet(rows, config.category)
    if (result.length > 0) { parsed = result; break }
  }

  if (parsed.length === 0) {
    return NextResponse.json({
      error: 'Aucun produit trouvé dans ce fichier. Vérifiez que le bon fournisseur est sélectionné et que les prix sont remplis.',
    }, { status: 400 })
  }

  const { count, error } = await upsertLocalSupplier(admin, config, parsed, dateLimite)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({
    success: true,
    message: `${config.supplierName} — ${count} produit${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''}.`,
    stats: {
      productsCreated: count,
      productsUpdated: 0,
      errors: 0,
      /** Liste effacée puis réécrite : pas d’UPDATE SQL, d’où « Mis à jour » à 0 dans l’ancien affichage */
      importStrategy: 'replace' as const,
    },
    errors: [],
  })
}
