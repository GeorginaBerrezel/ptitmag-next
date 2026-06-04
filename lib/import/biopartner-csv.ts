/** Parse et transformation CSV Biopartner (partagé import + découpage). */

import { vatMultiplierFromLabel } from '@/lib/import/biopartner-vat'

export type BiopartnerRow = {
  Article: string
  Désignation: string
  'Désignation 2': string
  Unité: string
  UM: string
  UC: string
  'Unité Prix': string
  Prix: string
  Origine: string
  Certifcation: string
  Emballage: string
  Facteur: string
  'Groupe produit principal': string
  Marque: string
  'Categorie produit': string
  /** Colonne Z — ex. « Taux TVA réduit 2.6% » ou « Taux TVA normal 8.1% » */
  TVA?: string
}

export type ParsedBiopartnerCsv = {
  preamble: string[]
  headers: string[]
  rows: BiopartnerRow[]
}

export function parseBiopartnerCsv(text: string): ParsedBiopartnerCsv {
  const lines = text
    .split('\n')
    .map(l => l.trimEnd())
    .filter((line, idx, arr) => line.length > 0 || idx === arr.length - 1)

  const headerIdx = lines.findIndex(l => l.trim().startsWith('Article;'))
  if (headerIdx === -1) {
    throw new Error(
      'En-têtes Biopartner introuvables. Vérifiez que le fichier contient une ligne "Article;Désignation;…"',
    )
  }

  const headers = lines[headerIdx].split(';')
  const preamble = lines.slice(0, headerIdx).map(l => l.trim()).filter(Boolean)

  const rows = lines
    .slice(headerIdx + 1)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const values = line.split(';')
      return Object.fromEntries(
        headers.map((h, i) => [h, values[i]?.trim() ?? '']),
      ) as BiopartnerRow
    })
    .filter(row => row.Article && row.Désignation)

  return { preamble, headers, rows }
}

export function rowToCsvLine(headers: string[], row: BiopartnerRow): string {
  return headers.map(h => row[h as keyof BiopartnerRow] ?? '').join(';')
}

export function buildBiopartnerCsvFile(parsed: ParsedBiopartnerCsv, rows: BiopartnerRow[]): string {
  const headerLine = parsed.headers.join(';')
  const body = rows.map(r => rowToCsvLine(parsed.headers, r))
  return [...parsed.preamble, headerLine, ...body].join('\n') + '\n'
}

export function buildName(row: BiopartnerRow): string {
  const d2 = row['Désignation 2']?.trim()
  return d2 ? `${row.Désignation} – ${d2}` : row.Désignation
}

export function buildUnit(row: BiopartnerRow): string {
  const emb = row.Emballage?.trim()
  if (emb && emb !== 'non défini') return emb
  if (row.Unité === 'KG') return 'kg'
  if (row.Unité === 'PCE') return 'pièce'
  return row.Unité?.toLowerCase() || 'pièce'
}

export function buildDescription(row: BiopartnerRow): string | null {
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

export function buildCategory(row: BiopartnerRow): string | null {
  const sub = row['Categorie produit']?.trim()
  if (sub) return sub.replace(/^\d+\s*-\s*/, '').trim()
  const raw = row['Groupe produit principal']?.trim()
  if (!raw) return null
  return raw.replace(/^\d+\s*-\s*/, '').trim()
}

function parsePrice(prix: string): number | null {
  if (!prix) return null
  const n = parseFloat(prix.replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

export function parseMinQuantity(uc: string): number {
  const n = parseInt(uc, 10)
  return Number.isNaN(n) || n < 1 ? 1 : n
}

export function buildUnitPrice(row: BiopartnerRow): number | null {
  const raw = parsePrice(row.Prix)
  if (raw == null) return null
  // UM = 1 : prix déjà TTC chez Biopartner ; UM = 0 : HT → appliquer le taux colonne TVA
  if (row.UM === '1') return Math.round(raw * 100) / 100
  const mult = vatMultiplierFromLabel(row.TVA)
  return Math.round(raw * mult * 100) / 100
}

export function rowToProduct(row: BiopartnerRow, supplierId: string) {
  const minQuantity = parseMinQuantity(row.UC)
  return {
    name: buildName(row),
    description: buildDescription(row),
    category: buildCategory(row),
    unit: buildUnit(row),
    unit_price: buildUnitPrice(row),
    min_quantity: minQuantity,
    allows_partial_order: minQuantity > 1,
    order_deadline: null as string | null,
    supplier_id: supplierId,
    supplier_ref: row.Article,
    active: true,
    is_featured: false,
  }
}
