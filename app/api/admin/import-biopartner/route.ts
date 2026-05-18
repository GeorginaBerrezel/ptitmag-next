import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

// Colonnes du fichier "Liste de commandes personnelle" Biopartner (séparateur ;)
type BiopartnerRow = {
  Article: string
  Désignation: string
  'Désignation 2': string
  Unité: string        // KG | PCE
  UM: string           // 0 = HT, 1 = TTC
  UC: string           // quantité minimum de commande
  'Unité Prix': string
  Prix: string         // ex: "6,25" → virgule décimale
  Origine: string      // code pays (CH, ES, IT, FR…)
  Certifcation: string // EB, DM, KCH, CHB…
  Emballage: string    // "Barquette de 25", "Brique de 1 l", "non défini"…
  Facteur: string
  'Groupe produit principal': string // "1 - Fruits et légumes"
  Marque: string
  'Categorie produit': string        // "Légumes", "Agrumes", "Lait/crème"…
}

/**
 * Parse le CSV Biopartner (séparateur ;, virgule décimale).
 * Les 7 premières lignes sont des métadonnées → on cherche la ligne d'en-têtes
 * qui commence par "Article;".
 */
function parseBiopartnerCsv(text: string): BiopartnerRow[] {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const headerIdx = lines.findIndex(l => l.startsWith('Article;'))
  if (headerIdx === -1) {
    throw new Error(
      'En-têtes Biopartner introuvables. Vérifiez que le fichier commence bien par "Article;Désignation;…"'
    )
  }

  const headers = lines[headerIdx].split(';')

  return lines
    .slice(headerIdx + 1)
    .map(line => {
      const values = line.split(';')
      return Object.fromEntries(
        headers.map((h, i) => [h, values[i]?.trim() ?? ''])
      ) as BiopartnerRow
    })
    .filter(row => row.Article && row.Désignation)
}

/** "Courgette" + "cal. 14-21" → "Courgette – cal. 14-21" */
function buildName(row: BiopartnerRow): string {
  const d2 = row['Désignation 2']?.trim()
  return d2 ? `${row.Désignation} – ${d2}` : row.Désignation
}

/**
 * Unité lisible pour les membres.
 * Priorité : Emballage (si défini) > Unité de base (KG → "kg", PCE → "pièce").
 */
function buildUnit(row: BiopartnerRow): string {
  const emb = row.Emballage?.trim()
  if (emb && emb !== 'non défini') return emb
  if (row.Unité === 'KG') return 'kg'
  if (row.Unité === 'PCE') return 'pièce'
  return row.Unité?.toLowerCase() || 'pièce'
}

/**
 * Description pour les membres : origine, certification bio, sous-catégorie.
 * Format lisible, uniquement les valeurs non vides / utiles.
 */
function buildDescription(row: BiopartnerRow): string | null {
  const parts: string[] = []

  const cert = row.Certifcation?.trim()
  if (cert) {
    const certLabels: Record<string, string> = {
      EB: 'Bio EU',
      DM: 'Demeter',
      KCH: 'Bio Suisse',
      CHB: 'Bio Suisse',
      K: 'Bio',
      FT: 'Fairtrade',
    }
    const certParts = cert.split('/').map(c => certLabels[c.trim()] ?? c.trim())
    parts.push(certParts.join(' · '))
  }

  const origine = row.Origine?.trim()
  if (origine) {
    const pays: Record<string, string> = {
      CH: 'Suisse', ES: 'Espagne', IT: 'Italie', FR: 'France',
      PE: 'Pérou', EC: 'Équateur', CO: 'Colombie', DE: 'Allemagne',
    }
    parts.push(`Origine : ${pays[origine] ?? origine}`)
  }

  const subcat = row['Categorie produit']?.trim()
  if (subcat) parts.push(subcat)

  const marque = row.Marque?.trim()
  if (marque && marque !== 'nicht definiert') parts.push(marque)

  return parts.length > 0 ? parts.join(' · ') : null
}

/** "1 - Fruits et légumes" → "Fruits et légumes" */
function buildCategory(row: BiopartnerRow): string | null {
  const raw = row['Groupe produit principal']?.trim()
  if (!raw) return null
  return raw.replace(/^\d+\s*-\s*/, '').trim()
}

/** "6,25" → 6.25 */
function parsePrice(prix: string): number | null {
  if (!prix) return null
  const n = parseFloat(prix.replace(',', '.'))
  return isNaN(n) ? null : n
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const adminEmails = [process.env.ADMIN_EMAIL ?? 'info@leptitmag.org', 'georgina.berrezel@gmail.com']
  if (!adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Accès réservé à l\'administrateur.' }, { status: 403 })
  }

  const supabaseAdmin = createAdminClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const dateLimite = (formData.get('date_limite_commande') as string | null)?.trim() || null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })
  }

  const text = await file.text()

  let rows: BiopartnerRow[]
  try {
    rows = parseBiopartnerCsv(text)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Aucun produit trouvé dans le fichier.' }, { status: 400 })
  }

  // Créer ou récupérer le fournisseur "Biopartner"
  const { data: existingBp } = await supabaseAdmin
    .from('suppliers')
    .select('id')
    .eq('name', 'Biopartner')
    .single()

  let biopartnerId: string

  if (existingBp) {
    biopartnerId = existingBp.id
  } else {
    const { data: newBp, error: bpError } = await supabaseAdmin
      .from('suppliers')
      .insert({ name: 'Biopartner', type: 'grossiste_bio', active: true })
      .select('id')
      .single()

    if (bpError || !newBp) {
      return NextResponse.json(
        { error: `Impossible de créer le fournisseur Biopartner : ${bpError?.message}` },
        { status: 500 }
      )
    }
    biopartnerId = newBp.id
  }

  // ── Préparer tous les produits d'un coup ──────────────────────────────────
  // Les prix Biopartner sont HT (hors TVA). On applique +2.6% pour obtenir le TTC.
  const TVA_RATE = 1.026
  const allProducts = rows.map(row => ({
    name: buildName(row),
    description: buildDescription(row),
    category: buildCategory(row),
    unit: buildUnit(row),
    unit_price: parsePrice(row.Prix) != null
      ? Math.round(parsePrice(row.Prix)! * TVA_RATE * 100) / 100
      : null,
    min_quantity: row.UC ? parseInt(row.UC) || 1 : 1,
    allows_partial_order: row.UM === '1',
    order_deadline: dateLimite || null,
    supplier_id: biopartnerId,
    supplier_ref: row.Article,
    active: true,
    is_featured: false,
  }))

  // ── Upsert en masse par lots de 200 ──────────────────────────────────────
  // Un seul aller-retour DB par lot au lieu de 1 requête par produit.
  // Nécessite la contrainte UNIQUE (supplier_id, supplier_ref) sur la table.
  const BATCH = 200
  const errors: string[] = []
  let totalUpserted = 0

  for (let i = 0; i < allProducts.length; i += BATCH) {
    const batch = allProducts.slice(i, i + BATCH)
    const { error: upsertErr } = await supabaseAdmin
      .from('products')
      .upsert(batch, {
        onConflict: 'supplier_id,supplier_ref',
        ignoreDuplicates: false,
      })

    if (upsertErr) {
      errors.push(`Lot ${Math.floor(i / BATCH) + 1} : ${upsertErr.message}`)
    } else {
      totalUpserted += batch.length
    }
  }

  return NextResponse.json({
    success: true,
    stats: {
      productsCreated: totalUpserted,
      productsUpdated: 0,
      errors: errors.length,
    },
    errors,
    message: `Import Biopartner terminé : ${totalUpserted} produit(s) importé(s) en ${Math.ceil(allProducts.length / BATCH)} lot(s).`,
  })
}
