// Utilitaires partagés pour l'import des fournisseurs locaux (xlsx)
// Utilisé par import-hebdo (feuille complète) et import-local-supplier (fichier individuel).

export type ParsedProduct = {
  name: string
  category: string
  unit: string
  unitPrice: number
}

export type LocalSupplierConfig = {
  supplierName: string
  supplierType: 'local' | 'grossiste_bio' | 'autre'
  category: string
  // Groupe de délai : 'mercredi' = Graines d'Avenir + Truffes, 'jeudi' = tous les autres
  deadlineGroup: 'mercredi' | 'jeudi'
}

// ─── Mapping clé → config ────────────────────────────────────────────────────
// La même clé est utilisée dans :
//   - import-hebdo     : indexé par nom d'onglet Excel
//   - import-local     : indexé par clé de formulaire (supplier=bioterroir, etc.)

export const LOCAL_SUPPLIER_CONFIG: Record<string, LocalSupplierConfig> = {
  bioterroir:       { supplierName: 'Bioterroir',             supplierType: 'local', category: 'Légumes & fruits',       deadlineGroup: 'jeudi'    },
  fermette_didi:    { supplierName: 'Fermette à Didi',         supplierType: 'local', category: 'Produits fermiers',       deadlineGroup: 'jeudi'    },
  graines_avenir:   { supplierName: "Graines d'Avenir",        supplierType: 'local', category: 'Boulangerie',             deadlineGroup: 'mercredi' },
  brasseries_ayent: { supplierName: "Brasseries d'Ayent",      supplierType: 'local', category: 'Bières',                  deadlineGroup: 'jeudi'    },
  vins_bio:         { supplierName: 'Vins bio et nature',      supplierType: 'local', category: 'Vins',                    deadlineGroup: 'jeudi'    },
  truffes:          { supplierName: 'Truffes au chocolat cru', supplierType: 'local', category: 'Chocolats & confiseries', deadlineGroup: 'mercredi' },
}

// Même mapping pour la feuille hebdo (indexé par nom d'onglet Excel)
export const HEBDO_SHEET_CONFIG: Record<string, LocalSupplierConfig> = {
  'Bioterroir':         LOCAL_SUPPLIER_CONFIG.bioterroir,
  'Fermette à Didi':    LOCAL_SUPPLIER_CONFIG.fermette_didi,
  "Graines d'Avenir":   LOCAL_SUPPLIER_CONFIG.graines_avenir,
  "Brasseries d'Ayent": LOCAL_SUPPLIER_CONFIG.brasseries_ayent,
  'Vins bio et nature': LOCAL_SUPPLIER_CONFIG.vins_bio,
  'Truffes':            LOCAL_SUPPLIER_CONFIG.truffes,
}

// ─── Parser commun ────────────────────────────────────────────────────────────
// Format A — feuille hebdomadaire / onglet Joel (colonnes espacées) :
//   ["Produit","","Quantité","","Prix d'achat TTC/HT","","Total TTC"]
//   [nom, "", "", "", prix(number|string), unité(string), 0]
//
// Format B — exports courts (ex : Truffes.xlsx seul, 3 colonnes) :
//   ["Produit", "Prix d'achat TTC", …] ou ["Produit", "CHF 1,00", "pce"]

function trimCell(v: unknown): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim()
}

/** "CHF 1,00" | 3.8 | "6,25" → nombre positif ou null */
function parsePriceLike(raw: unknown): number | null {
  if (typeof raw === 'number' && !isNaN(raw) && raw > 0) return raw
  if (raw == null || raw === '') return null
  const cleaned = String(raw)
    .replace(/CHF/gi, '')
    .replace(/\s/g, '')
    .replace(/'/g, '')
    .replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) || n <= 0 ? null : n
}

function isTotalRow(unitOrName: string): boolean {
  const u = unitOrName.toLowerCase()
  return u.includes('total') || u.includes('ttc')
}

/**
 * Trouve la ligne d'en-tête contenant « Produit » (colonne A ou décalée après fusion).
 */
function findProduitHeader(rows: unknown[][]): { headerIdx: number; produitCol: number } | null {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!Array.isArray(r)) continue
    const j = r.findIndex(
      cell => typeof cell === 'string' && cell.trim().toLowerCase() === 'produit',
    )
    if (j !== -1) return { headerIdx: i, produitCol: j }
  }
  return null
}

/** Extrait prix + unité pour une ligne (essaie d'abord le gabarit large, puis le compact). */
function extractPriceUnit(row: unknown[]): { price: number; unit: string } | null {
  const u5 = trimCell(row[5])
  const u4 = trimCell(row[4])

  const p4 = parsePriceLike(row[4])
  if (p4 != null) {
    const unit = trimCell(row[5])
    if (!isTotalRow(unit)) return { price: p4, unit: unit || 'pièce' }
  }

  const p1 = parsePriceLike(row[1])
  if (p1 != null) {
    let unit = trimCell(row[2])
    if (!unit || parsePriceLike(unit) != null) unit = trimCell(row[3])
    if (!isTotalRow(unit)) return { price: p1, unit: unit || 'pièce' }
  }

  const p2 = parsePriceLike(row[2])
  if (p2 != null) {
    const unit = trimCell(row[3]) || trimCell(row[1])
    if (!isTotalRow(unit)) return { price: p2, unit: unit || 'pièce' }
  }

  return null
}

export function parseLocalSheet(rows: unknown[][], category: string): ParsedProduct[] {
  const products: ParsedProduct[] = []

  const header = findProduitHeader(rows)
  if (!header) return []

  const { headerIdx, produitCol } = header

  for (const row of rows.slice(headerIdx + 1)) {
    if (!Array.isArray(row)) continue
    const name = trimCell(row[produitCol])
    if (!name) continue
    if (name.toLowerCase() === 'produit') continue

    const shifted = produitCol === 0 ? row : row.slice(produitCol)
    const got = extractPriceUnit(shifted)
    if (!got) continue
    if (isTotalRow(got.unit) || isTotalRow(name)) continue

    products.push({
      name,
      category,
      unit: got.unit || 'pièce',
      unitPrice: got.price,
    })
  }

  return products
}
