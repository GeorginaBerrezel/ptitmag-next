/** Import CSV générique (point-virgule) pour nouveaux grossistes — en-têtes flexibles. */

export type GenericParsedProduct = {
  supplierRef: string | null
  name: string
  description: string | null
  category: string | null
  unit: string
  unitPrice: number | null
  minQuantity: number
  allowsPartialOrder: boolean
}

function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/CHF/gi, '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isNaN(n) || n <= 0 ? null : n
}

function headerIndex(headers: string[], needles: string[]): number {
  return headers.findIndex(h => needles.some(n => h.includes(n)))
}

/**
 * CSV avec ligne d'en-tête. Colonnes reconnues (insensible à la casse) :
 * nom / name / designation / produit ; ref / code / article ;
 * categorie / category / groupe ; unite / unit ; prix / price / tarif
 */
export function parseGenericCatalogCsv(rows: string[][]): GenericParsedProduct[] {
  if (rows.length < 2) return []

  const headers = rows[0].map(c => c.trim().toLowerCase())
  const nameIdx = headerIndex(headers, ['nom', 'name', 'designation', 'produit', 'article', 'libelle'])
  const refIdx = headerIndex(headers, ['ref', 'reference', 'code', 'sku', 'n°', 'no '])
  const catIdx = headerIndex(headers, ['categor', 'groupe', 'famille', 'rayon'])
  const unitIdx = headerIndex(headers, ['unite', 'unit', 'uv', 'conditionnement'])
  const priceIdx = headerIndex(headers, ['prix', 'price', 'tarif', 'pv', 'montant'])

  if (nameIdx < 0) {
    throw new Error(
      'En-tête « nom » (ou name / designation / produit) introuvable. Utilisez un CSV UTF-8 avec point-virgule (;).',
    )
  }

  const products: GenericParsedProduct[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const name = r[nameIdx]?.trim()
    if (!name) continue

    const price = priceIdx >= 0 ? parsePrice(r[priceIdx]) : null
    if (price == null) continue

    products.push({
      supplierRef: refIdx >= 0 ? r[refIdx]?.trim() || null : null,
      name,
      description: null,
      category: catIdx >= 0 ? r[catIdx]?.trim() || 'Autres' : 'Autres',
      unit: unitIdx >= 0 ? r[unitIdx]?.trim() || 'pièce' : 'pièce',
      unitPrice: price,
      minQuantity: 1,
      allowsPartialOrder: false,
    })
  }

  return products
}
