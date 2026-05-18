import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import * as XLSX from 'xlsx'

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL ?? 'info@leptitmag.org',
  'georgina.berrezel@gmail.com',
]

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedProduct = {
  name: string
  category: string
  unit: string
  unitPrice: number
}

type SheetConfig = {
  supplierName: string
  supplierType: 'local' | 'grossiste_bio' | 'autre'
  category: string
  deadlineGroup: 'mercredi' | 'jeudi'
}

// ─── Mapping onglet Excel → fournisseur Supabase ──────────────────────────────
// Chaque onglet de la feuille hebdo correspond à un fournisseur local.
// L'onglet "Biopartner et total" est ignoré (import séparé via CSV Biopartner).
//
// deadlineGroup :
//   'mercredi' → Graines d'Avenir + Truffes (délai plus court)
//   'jeudi'    → tous les autres fournisseurs

const SHEET_CONFIG: Record<string, SheetConfig> = {
  'Bioterroir':          { supplierName: 'Bioterroir',             supplierType: 'local', category: 'Légumes & fruits',        deadlineGroup: 'jeudi'    },
  'Fermette à Didi':     { supplierName: 'Fermette à Didi',         supplierType: 'local', category: 'Produits fermiers',        deadlineGroup: 'jeudi'    },
  "Graines d'Avenir":    { supplierName: "Graines d'Avenir",        supplierType: 'local', category: 'Boulangerie',              deadlineGroup: 'mercredi' },
  "Brasseries d'Ayent":  { supplierName: "Brasseries d'Ayent",      supplierType: 'local', category: 'Bières',                   deadlineGroup: 'jeudi'    },
  'Vins bio et nature':  { supplierName: 'Vins bio et nature',      supplierType: 'local', category: 'Vins',                     deadlineGroup: 'jeudi'    },
  'Truffes':             { supplierName: 'Truffes au chocolat cru', supplierType: 'local', category: 'Chocolats & confiseries',  deadlineGroup: 'mercredi' },
}

// ─── Format commun de tous les onglets ────────────────────────────────────────
//
// Ligne 0 (non-vide) : "Nom fournisseur – Livraison…" (titre)
// Ligne 1 (non-vide) : En-têtes : Produit | | Quantité | | Prix d'achat TTC/HT | | Total
// Lignes suivantes   : [nom, "", "", "", prix (number), unité (string), total]
// Dernière ligne     : ["", "", "", "", "", "Total TTC", 0]
//
// col[0] = nom du produit
// col[4] = prix d'achat (number)
// col[5] = unité (string)

function parseSheet(rows: unknown[][]): ParsedProduct[] {
  const products: ParsedProduct[] = []

  // Trouver la ligne d'en-têtes contenant "Produit"
  const headerIdx = rows.findIndex(r =>
    typeof r[0] === 'string' && r[0].trim().toLowerCase() === 'produit'
  )
  if (headerIdx === -1) return []

  for (const row of rows.slice(headerIdx + 1)) {
    const name = typeof row[0] === 'string' ? row[0].trim() : ''
    const price = typeof row[4] === 'number' ? row[4] : parseFloat(String(row[4] ?? ''))
    const unit  = typeof row[5] === 'string' ? row[5].trim() : String(row[5] ?? '').trim()

    // Ignorer les lignes vides et la ligne de total
    if (!name) continue
    if (unit.toLowerCase().includes('total')) continue
    if (isNaN(price) || price <= 0) continue

    products.push({
      name,
      category: '',  // Sera injecté par le caller via SheetConfig
      unit: unit || 'pièce',
      unitPrice: price,
    })
  }

  return products
}

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Authentification admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 })
  }

  const admin = createAdminClient()
  const formData = await request.formData()

  const file = formData.get('file') as File | null
  // Deux groupes de délais : mercredi (Graines d'Avenir + Truffes) et jeudi (tous les autres)
  const dateLimiteMercredi = (formData.get('date_limite_mercredi') as string | null)?.trim() || null
  const dateLimiteJeudi    = (formData.get('date_limite_jeudi')    as string | null)?.trim() || null

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })

  // ── Lire le fichier Excel ─────────────────────────────────────────────────
  const buffer = Buffer.from(await file.arrayBuffer())
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: 'Impossible de lire le fichier Excel. Assurez-vous que c\'est bien un fichier .xlsx valide.' }, { status: 400 })
  }

  // ── Traiter chaque onglet configuré ──────────────────────────────────────
  const globalStats = {
    sheetsProcessed: 0,
    productsImported: 0,
    errors: [] as string[],
  }

  const sheetResults: Record<string, { count: number; supplierName: string }> = {}

  for (const sheetName of workbook.SheetNames) {
    const config = SHEET_CONFIG[sheetName]
    if (!config) continue  // Ignorer l'onglet Biopartner et tout inconnu

    const ws = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

    const parsed = parseSheet(rows).map(p => ({ ...p, category: config.category }))

    if (parsed.length === 0) {
      globalStats.errors.push(`${sheetName} : aucun produit trouvé (feuille vide ou format inattendu).`)
      continue
    }

    // ── Créer ou récupérer le fournisseur ────────────────────────────────
    let supplierId: string
    const { data: existing } = await admin
      .from('suppliers')
      .select('id')
      .eq('name', config.supplierName)
      .single()

    if (existing) {
      supplierId = existing.id
    } else {
      const { data: created, error: sErr } = await admin
        .from('suppliers')
        .insert({ name: config.supplierName, type: config.supplierType, active: true })
        .select('id')
        .single()
      if (sErr || !created) {
        globalStats.errors.push(`${sheetName} : impossible de créer le fournisseur — ${sErr?.message}`)
        continue
      }
      supplierId = created.id
    }

    // ── Supprimer les anciens produits, insérer les nouveaux ─────────────
    // Stratégie delete+insert : les feuilles hebdo n'ont pas de référence article.
    const { error: delErr } = await admin
      .from('products')
      .delete()
      .eq('supplier_id', supplierId)

    if (delErr) {
      globalStats.errors.push(`${sheetName} : impossible de supprimer les anciens produits — ${delErr.message}`)
      continue
    }

    const deadline = config.deadlineGroup === 'mercredi' ? dateLimiteMercredi : dateLimiteJeudi

    const toInsert = parsed.map(p => ({
      name: p.name,
      description: null,
      category: p.category,
      unit: p.unit,
      unit_price: p.unitPrice,
      min_quantity: 1,
      allows_partial_order: false,
      order_deadline: deadline,
      supplier_id: supplierId,
      supplier_ref: null,
      active: true,
      is_featured: false,
    }))

    const BATCH = 200
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const { error: insErr } = await admin
        .from('products')
        .insert(toInsert.slice(i, i + BATCH))
      if (insErr) {
        globalStats.errors.push(`${sheetName} lot ${Math.floor(i / BATCH) + 1} : ${insErr.message}`)
      }
    }

    globalStats.sheetsProcessed++
    globalStats.productsImported += parsed.length
    sheetResults[sheetName] = { count: parsed.length, supplierName: config.supplierName }
  }

  const message = globalStats.sheetsProcessed === 0
    ? 'Aucun onglet reconnu dans ce fichier.'
    : `${globalStats.sheetsProcessed} fournisseur${globalStats.sheetsProcessed > 1 ? 's' : ''} importé${globalStats.sheetsProcessed > 1 ? 's' : ''} — ${globalStats.productsImported} produit${globalStats.productsImported > 1 ? 's' : ''} au total.`

  return NextResponse.json({
    success: globalStats.sheetsProcessed > 0,
    message,
    stats: {
      productsCreated: globalStats.productsImported,
      productsUpdated: 0,
      errors: globalStats.errors.length,
      sheetResults,
    },
    errors: globalStats.errors,
  })
}
