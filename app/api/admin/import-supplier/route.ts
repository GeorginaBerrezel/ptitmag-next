import { createAdminClient } from '@/lib/supabase/admin'
import { parseGenericCatalogCsv } from '@/lib/import/generic-catalog-csv'
import { readUploadAsGrid } from '@/lib/import/spreadsheet-file'
import { upsertSupplierCatalog } from '@/lib/import/upsert-local'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/admin/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ParsedProduct = {
  supplierRef: string | null
  name: string
  description: string | null
  category: string | null
  unit: string
  unitPrice: number | null
  minQuantity: number
  allowsPartialOrder: boolean
}

type SupplierConfig = {
  name: string
  type: 'local' | 'grossiste_bio' | 'autre'
  parse: (rows: string[][], allText: string) => ParsedProduct[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers partagés
// ─────────────────────────────────────────────────────────────────────────────

/** "6,25" | "CHF 12,00" | " \t6,70 CHF " → 6.25 */
function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/CHF/gi, '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) || n === 0 ? null : n
}

/** Normalise les unités Bioterroir : "Kg" → "kg", "btle(s)" → "bouteille", etc. */
function normalizeUnit(raw: string): string {
  if (!raw) return 'pièce'
  return raw
    .replace(/\bpce\(s?\)\b/gi, 'pièce')
    .replace(/\bpce\b/gi, 'pièce')
    .replace(/\bbtle\(s?\)\b/gi, 'bouteille')
    .replace(/\bcarton\(s?\)/gi, 'carton')
    .replace(/\bsac\(s?\)/gi, 'sac')
    .replace(/\bbarquette\(s?\)/gi, 'barquette')
    .replace(/\bpot\(s?\)/gi, 'pot')
    .replace(/\bKg\b/g, 'kg')
    .trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Parseur Bioterroir (Feuil2 — sans en-têtes, colonnes positionnelles)
//
// Format : id;nom;", Bio";Kg;3,80;3
// ─────────────────────────────────────────────────────────────────────────────

function parseBioterroir(rows: string[][]): ParsedProduct[] {
  return rows
    .filter(r => r[0] && /^\d+$/.test(r[0].trim()) && r[1]?.trim())
    .map(r => ({
      supplierRef: r[0].trim(),
      name: r[1].trim(),
      description: r[2]?.trim().replace(/^,\s*/, '') || null,
      category: 'Légumes & fruits',
      unit: normalizeUnit(r[3]?.trim() || 'kg'),
      unitPrice: parsePrice(r[4]),
      minQuantity: 0.25,
      allowsPartialOrder: false,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Parseur Cave à levain
//
// En-têtes ligne 10 : produits;Poids;P.U. en CHF;Quantité;Prix;certifié BIO
// Les lignes de section (sans prix) deviennent la catégorie courante.
// ─────────────────────────────────────────────────────────────────────────────

function parseCaveALevain(rows: string[][]): ParsedProduct[] {
  const headerIdx = rows.findIndex(r =>
    r[0]?.toLowerCase().startsWith('produits') &&
    r[2]?.toLowerCase().includes('p.u')
  )
  if (headerIdx === -1) return []

  const products: ParsedProduct[] = []
  let currentCategory = 'Boulangerie'

  for (const row of rows.slice(headerIdx + 1)) {
    const name = row[0]?.trim()
    const poids = row[1]?.trim()
    const prixRaw = row[2]?.trim()
    const bio = row[5]?.trim().toLowerCase()

    if (!name) continue
    if (name.startsWith('TOTAL') || name.startsWith('Total')) continue

    const prix = parsePrice(prixRaw)

    // Ligne de section : nom présent mais pas de prix
    if (!prix) {
      // Nettoyage : retire les parenthèses et le contenu de sous-titres
      const cleanName = name.replace(/\(.*?\)/g, '').trim()
      if (cleanName) currentCategory = cleanName
      continue
    }

    products.push({
      supplierRef: null,
      name,
      description: bio === 'oui' ? 'Bio certifié' : null,
      category: currentCategory,
      unit: poids || 'pièce',
      unitPrice: prix,
      minQuantity: 1,
      allowsPartialOrder: false,
    })
  }

  return products
}

// ─────────────────────────────────────────────────────────────────────────────
// Parseur Les Dailles (Domaine des Dailles — farines & céréales)
//
// Format : "Nom FR\nNom DE\nMarque";1;kg; \t6,70 CHF ; ...
// Chaque produit a 3 variantes (1 kg, 5 kg, 25 kg) en lignes successives.
// ─────────────────────────────────────────────────────────────────────────────

function parseLesDailles(rows: string[][]): ParsedProduct[] {
  // La ligne d'en-têtes contient "Produit" et "Prix"
  const headerIdx = rows.findIndex(r =>
    r[0]?.toLowerCase().includes('produit') &&
    r[3]?.toLowerCase().includes('prix')
  )
  if (headerIdx === -1) return []

  const products: ParsedProduct[] = []
  let currentName = ''

  for (const row of rows.slice(headerIdx + 1)) {
    const nameCell = row[0]?.trim()
    const qty = row[1]?.trim()
    const unitType = row[2]?.trim()
    const priceCell = row[3]?.trim()

    // Ligne de pied de page
    if (nameCell?.toLowerCase().includes('tva') ||
        nameCell?.toLowerCase().includes('mise à jour') ||
        nameCell?.toLowerCase().includes('total')) break

    // Nouveau produit : le nom est dans col 0 (peut être multiline)
    if (nameCell) {
      // Prendre uniquement la première ligne (le nom français)
      currentName = nameCell.split('\n')[0].trim()
    }

    if (!currentName || !qty || !unitType || !priceCell) continue

    const price = parsePrice(priceCell)
    if (price == null) continue

    // Unité = "1 kg", "5 kg", "500 g"…
    const unit = `${qty} ${unitType}`

    products.push({
      supplierRef: null,
      name: currentName,
      description: null,
      category: 'Farines & Céréales',
      unit,
      unitPrice: price,
      minQuantity: 1,
      allowsPartialOrder: false,
    })
  }

  return products
}

// ─────────────────────────────────────────────────────────────────────────────
// Parseur Novoma (compléments alimentaires)
//
// Format : ;Produit;;Format;;CHF 12,00;;CHF 7,20;;CHF 6,90;;CHF 0,00
// col[1]=nom, col[3]=format, col[5]=prix×1, col[7]=prix×10-24, col[9]=prix×25-99
// Sections : col[1] vide et col[5] = nom de section (ex: "GAMME SPORT")
// ─────────────────────────────────────────────────────────────────────────────

function parseNovoma(rows: string[][]): ParsedProduct[] {
  // Trouver la ligne d'en-tête "Produit"
  const headerIdx = rows.findIndex(r => r[1]?.trim() === 'Produit')
  if (headerIdx === -1) return []

  const products: ParsedProduct[] = []
  let currentCategory = 'Compléments'

  for (const row of rows.slice(headerIdx + 1)) {
    const name = row[1]?.trim()
    const format = row[3]?.trim()
    const priceCell = row[5]?.trim()

    if (!name && !priceCell) continue

    // Ligne de section : name vide mais col[5] a un libellé (ex: "GAMME SPORT")
    if (!name && priceCell && !priceCell.includes('CHF')) {
      currentCategory = priceCell
      continue
    }

    // Pied de page / lignes vides
    if (!name || name === 'Produit') continue
    if (!priceCell || !priceCell.includes('CHF')) continue

    const price = parsePrice(priceCell)
    if (price == null) continue

    products.push({
      supplierRef: null,
      name,
      description: null,
      category: currentCategory,
      unit: format || 'pièce',
      unitPrice: price,
      minQuantity: 1,
      allowsPartialOrder: false,
    })
  }

  return products
}

// ─────────────────────────────────────────────────────────────────────────────
// Parseur NaturMel (cosmétiques bio — M'Cosmetics)
//
// En-têtes : Réf.;Produit;Conditionnement;Présentation;PV TTC;Rabais%;Min cde;Qté;HT;Testeur;Echant;< 5pces;=> 5pces
// Sections : col[0] = nom section (ex: "SOINS VISAGE"), col[1] vide
// Produits : col[0]=réf, col[1]=nom, col[2]=unité, col[11]=prix<5pcs, col[12]=prix>=5pcs
// ─────────────────────────────────────────────────────────────────────────────

function parseNaturMel(rows: string[][]): ParsedProduct[] {
  // La ligne d'en-tête contient "Réf." et "Produit"
  const headerIdx = rows.findIndex(r =>
    r[0]?.trim() === 'Réf.' || r[0]?.includes('Réf')
  )
  if (headerIdx === -1) return []

  const products: ParsedProduct[] = []
  let currentCategory = 'Cosmétiques'

  for (const row of rows.slice(headerIdx + 1)) {
    const ref = row[0]?.trim()
    const name = row[1]?.trim()
    const unit = row[2]?.trim()
    const presentation = row[3]?.trim()
    const priceBase = row[11]?.trim()  // prix < 5 pièces

    // Ligne de section : col[0] a un libellé (ALL CAPS ou lisible) et col[1] est vide
    if (ref && !name && !priceBase) {
      currentCategory = ref
      continue
    }

    // Sous-section ou ligne vide
    if (!name || !priceBase) continue
    if (name === 'Produit') continue

    const price = parsePrice(priceBase)
    if (price == null) continue

    const desc = presentation ? presentation : null

    products.push({
      supplierRef: ref || null,
      name,
      description: desc,
      category: currentCategory,
      unit: unit || 'pièce',
      unitPrice: price,
      minQuantity: 1,
      allowsPartialOrder: false,
    })
  }

  return products
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration des fournisseurs
// ─────────────────────────────────────────────────────────────────────────────

const SUPPLIER_CONFIGS: Record<string, SupplierConfig> = {
  bioterroir: {
    name: 'Bioterroir',
    type: 'local',
    parse: (rows) => parseBioterroir(rows),
  },
  cave_levain: {
    name: "Cave à levain",
    type: 'local',
    parse: (rows) => parseCaveALevain(rows),
  },
  dailles: {
    name: 'Domaine des Dailles',
    type: 'local',
    parse: (rows) => parseLesDailles(rows),
  },
  novoma: {
    name: 'Novoma',
    type: 'grossiste_bio',
    parse: (rows) => parseNovoma(rows),
  },
  naturmel: {
    name: "NaturMel",
    type: 'grossiste_bio',
    parse: (rows) => parseNaturMel(rows),
  },
  saldac: {
    name: 'Saldac',
    type: 'grossiste_bio',
    parse: (rows) => parseGenericCatalogCsv(rows),
  },
  gebana: {
    name: 'Gebana',
    type: 'grossiste_bio',
    parse: (rows) => parseGenericCatalogCsv(rows),
  },
  dr_jacobs: {
    name: "Dr Jacob's",
    type: 'grossiste_bio',
    parse: (rows) => parseGenericCatalogCsv(rows),
  },
  kumbha: {
    name: 'Kumbha Sàrl',
    type: 'grossiste_bio',
    parse: (rows) => parseGenericCatalogCsv(rows),
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Route POST
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await requireAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 })
  }

  const supabaseAdmin = createAdminClient()
  const formData = await request.formData()

  const file = formData.get('file') as File | null
  const supplierKey = (formData.get('supplier') as string | null)?.trim().toLowerCase()
  const dateLimite = (formData.get('date_limite_commande') as string | null)?.trim() || null

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 })
  if (!supplierKey || !SUPPLIER_CONFIGS[supplierKey]) {
    return NextResponse.json({
      error: `Fournisseur inconnu : "${supplierKey}". Valeurs acceptées : ${Object.keys(SUPPLIER_CONFIGS).join(', ')}`,
    }, { status: 400 })
  }

  const config = SUPPLIER_CONFIGS[supplierKey]
  const rows = await readUploadAsGrid(file)

  let parsed: ParsedProduct[]
  try {
    parsed = config.parse(rows, '')
  } catch (err) {
    return NextResponse.json({ error: `Erreur de parsing : ${err}` }, { status: 400 })
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: 'Aucun produit trouvé. Vérifiez que le bon fichier est sélectionné.' }, { status: 400 })
  }

  // ── Créer ou récupérer le fournisseur ──────────────────────────────────────
  let supplierId: string
  const { data: existingSupplier } = await supabaseAdmin
    .from('suppliers')
    .select('id')
    .eq('name', config.name)
    .single()

  if (existingSupplier) {
    supplierId = existingSupplier.id
  } else {
    const { data: newSupplier, error: sErr } = await supabaseAdmin
      .from('suppliers')
      .insert({ name: config.name, type: config.type, active: true })
      .select('id')
      .single()
    if (sErr || !newSupplier) {
      return NextResponse.json({ error: `Impossible de créer le fournisseur : ${sErr?.message}` }, { status: 500 })
    }
    supplierId = newSupplier.id
  }

  // ── Préparer les produits ─────────────────────────────────────────────────
  const allProducts = parsed.map(p => ({
    name: p.name,
    description: p.description,
    category: p.category,
    unit: p.unit,
    unit_price: p.unitPrice,
    min_quantity: p.minQuantity,
    allows_partial_order: p.allowsPartialOrder,
    order_deadline: dateLimite,
    supplier_id: supplierId,
    supplier_ref: p.supplierRef,
    active: true,
    is_featured: false,
  }))

  const hasRefs = allProducts.every(p => p.supplier_ref)
  const errors: string[] = []
  let totalUpserted = 0
  const BATCH = 200

  if (hasRefs) {
    // ── Tous les produits ont une référence → upsert en masse ──────────────
    // Nécessite la contrainte UNIQUE (supplier_id, supplier_ref) sur la table.
    for (let i = 0; i < allProducts.length; i += BATCH) {
      const batch = allProducts.slice(i, i + BATCH)
      const { error: uErr } = await supabaseAdmin
        .from('products')
        .upsert(batch, { onConflict: 'supplier_id,supplier_ref', ignoreDuplicates: false })

      if (uErr) errors.push(`Lot ${Math.floor(i / BATCH) + 1} : ${uErr.message}`)
      else totalUpserted += batch.length
    }
  } else {
    // ── Pas de référence sur toutes les lignes → upsert par nom, masquer les absents
    // (ne supprime jamais : les produits déjà commandés restent liés aux commandes)
    const result = await upsertSupplierCatalog(
      supabaseAdmin,
      supplierId,
      parsed.map(p => ({
        supplierRef: p.supplierRef,
        name: p.name,
        description: p.description,
        category: p.category,
        unit: p.unit,
        unitPrice: p.unitPrice,
        minQuantity: p.minQuantity,
        allowsPartialOrder: p.allowsPartialOrder,
      })),
      { orderDeadline: dateLimite, deactivateMissing: true },
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    totalUpserted = result.count
    const deactivatedNote =
      result.deactivated && result.deactivated > 0
        ? ` ${result.deactivated} ancien${result.deactivated > 1 ? 's' : ''} produit${result.deactivated > 1 ? 's' : ''} masqué${result.deactivated > 1 ? 's' : ''} (absents du fichier).`
        : ''

    return NextResponse.json({
      success: true,
      stats: {
        productsCreated: result.inserted,
        productsUpdated: result.updated,
        productsDeactivated: result.deactivated ?? 0,
        errors: errors.length,
        importStrategy: 'upsert' as const,
      },
      errors,
      message: `${config.name} — ${totalUpserted} produit(s) synchronisé(s) (${result.inserted} nouveau${result.inserted > 1 ? 'x' : ''}, ${result.updated} mis à jour).${deactivatedNote}`,
    })
  }

  return NextResponse.json({
    success: true,
    stats: { productsCreated: totalUpserted, productsUpdated: 0, errors: errors.length },
    errors,
    message: `${config.name} — ${totalUpserted} produit(s) importé(s).`,
  })
}
