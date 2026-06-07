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

const HEADER_ERROR =
  'En-têtes Biopartner introuvables. Vérifiez que le fichier contient une ligne "Article;Désignation;…"'

/** Normalise une cellule Excel ou CSV en texte (UM, Prix, TVA…). */
export function biopartnerCellToString(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value)
    const s = value.toString()
    if (s.includes('e') || s.includes('E')) {
      return value.toFixed(4).replace(/\.?0+$/, '')
    }
    return s
  }
  return String(value).trim()
}

function buildParsedTable(
  headerIdx: number,
  grid: string[][],
): ParsedBiopartnerCsv {
  const headers = grid[headerIdx].map(h => h.trim())
  const preamble = grid
    .slice(0, headerIdx)
    .map(row => row.filter(Boolean).join(';'))
    .filter(Boolean)

  const rows = grid
    .slice(headerIdx + 1)
    .filter(row => row.some(cell => cell.length > 0))
    .map(values =>
      Object.fromEntries(
        headers.map((h, i) => [h, values[i]?.trim() ?? '']),
      ) as BiopartnerRow,
    )
    .filter(row => row.Article && row.Désignation)

  return { preamble, headers, rows }
}

/** Parse une grille (Excel ou CSV converti) — ligne « Article » en col. A. */
export function parseBiopartnerGrid(grid: unknown[][]): ParsedBiopartnerCsv {
  const stringGrid = grid.map(row =>
    (Array.isArray(row) ? row : []).map(biopartnerCellToString),
  )

  const headerIdx = stringGrid.findIndex(row => row[0]?.trim() === 'Article')
  if (headerIdx === -1) {
    throw new Error(HEADER_ERROR)
  }

  return buildParsedTable(headerIdx, stringGrid)
}

export function parseBiopartnerCsv(text: string): ParsedBiopartnerCsv {
  const lines = text
    .split('\n')
    .map(l => l.trimEnd())
    .filter((line, idx, arr) => line.length > 0 || idx === arr.length - 1)

  const headerIdx = lines.findIndex(l => l.trim().startsWith('Article;'))
  if (headerIdx === -1) {
    throw new Error(HEADER_ERROR)
  }

  const grid = lines.map(line => line.split(';').map(cell => cell.trim()))
  return buildParsedTable(headerIdx, grid)
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

/**
 * Commande partielle (+10 %) : seulement si UC > 1 et prix déjà TTC (UM = 1).
 * Ex. 410002015 (UC = 10, UM = 0) → minimum strict 10, pas de commande en dessous.
 */
export function allowsPartialBiopartnerOrder(row: BiopartnerRow, minQuantity: number): boolean {
  return minQuantity > 1 && row.UM === '1'
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
    allows_partial_order: allowsPartialBiopartnerOrder(row, minQuantity),
    order_deadline: null as string | null,
    supplier_id: supplierId,
    supplier_ref: row.Article,
    active: true,
    is_featured: false,
  }
}
