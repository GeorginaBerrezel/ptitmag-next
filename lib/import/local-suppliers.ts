// Utilitaires partagés pour l'import des fournisseurs locaux (xlsx)
// Utilisé par import-hebdo (feuille complète) et import-local-supplier (fichier individuel).

export type ParsedProduct = {
  name: string
  category: string
  unit: string
  unitPrice: number
  /** Numéro article en colonne avant « Produit » (ex. Bioterroir), si présent. */
  supplierRef?: string
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
// Format « Joel export onglet seul » (2026) — le plus fréquent :
//   ["Produit","","","Prix d'achat TTC",""]  → données [nom,"","", prix, unité]
//
// Format Bioterroir : deux prix puis unité
//   ["Produit","","","Prix HT","Prix TTC",""] → [nom,"","", HT, TTC, kilo|pce|…]
//
// Ancien gabarit large (feuille complète) :
//   [nom, "", "", "", prix, unité, …]
//
// Compact Produit | CHF | pce en colonnes A–C

function trimCell(v: unknown): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim()
}

/** "CHF 1,00" | 3.8 | "6,25" → nombre positif ou null (pas "250g", "33cl") */
function parsePriceLike(raw: unknown): number | null {
  if (typeof raw === 'number' && !isNaN(raw) && raw > 0) return raw
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  const withoutChf = s.replace(/CHF/gi, '').trim()
  if (/[a-zA-Zàâäéèêëïîôùûç]/i.test(withoutChf)) return null
  const cleaned = withoutChf.replace(/\s/g, '').replace(/'/g, '').replace(',', '.')
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

/**
 * Extrait prix + unité. Ordre important : Bioterroir 2 prix avant « prix col D seul ».
 */
function extractPriceUnit(row: unknown[]): { price: number; unit: string } | null {
  const p3 = parsePriceLike(row[3])
  const p4 = parsePriceLike(row[4])
  const s4 = trimCell(row[4])
  const s5 = trimCell(row[5])

  // 1 — Bioterroir : HT col 3, TTC col 4, unité col 5 (les deux premières cases sont numériques)
  if (p3 != null && p4 != null && s5 && parsePriceLike(s5) == null && !isTotalRow(s5)) {
    return { price: p4, unit: s5 || 'pièce' }
  }

  // 2 — Export standard Joel : prix col D (3), unité col E (4) — ex. Truffes, Vins, Brasseries…
  if (p3 != null && s4 && parsePriceLike(s4) == null && !isTotalRow(s4)) {
    return { price: p3, unit: s4 || 'pièce' }
  }

  // 3 — Ancien gabarit : prix col E (4), unité col F (5)
  const pLegacy = parsePriceLike(row[4])
  if (pLegacy != null) {
    const u = trimCell(row[5])
    if (!isTotalRow(u)) return { price: pLegacy, unit: u || 'pièce' }
  }

  // 4 — Compact : colonnes B–C–D (texte CHF ou nombre en B)
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

    let supplierRef: string | undefined
    if (produitCol > 0) {
      const maybeId = trimCell(row[produitCol - 1])
      if (/^\d+$/.test(maybeId)) supplierRef = maybeId
    }

    products.push({
      name,
      category,
      unit: got.unit || 'pièce',
      unitPrice: got.price,
      supplierRef,
    })
  }

  return products
}

/** Format Bioterroir sans ligne « Produit » : id en col. A, nom en B. */
export function parseBioterroirNumericRows(rows: unknown[][], category: string): ParsedProduct[] {
  const products: ParsedProduct[] = []
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    const id = trimCell(row[0])
    const name = trimCell(row[1])
    if (!/^\d+$/.test(id) || !name) continue
    const unitStr = trimCell(row[3]) || 'kg'
    const price = parsePriceLike(row[4])
    if (price == null) continue
    products.push({
      name,
      category,
      unit: unitStr,
      unitPrice: price,
      supplierRef: id,
    })
  }
  return products
}
