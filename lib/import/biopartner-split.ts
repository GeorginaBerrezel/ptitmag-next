import type { BiopartnerCatalogKey } from '@/lib/import/biopartner-catalogs'
import type { BiopartnerRow } from '@/lib/import/biopartner-csv'

/**
 * Répartition automatique d'une ligne CSV vers un des 4 catalogues.
 * Heuristique provisoire — Joel affinera avec ses propres fichiers CSV.
 * Priorité : surgelés → emballages → viandes → général.
 */
export function classifyBiopartnerRow(row: BiopartnerRow): BiopartnerCatalogKey {
  const blob = [
    row['Groupe produit principal'],
    row['Categorie produit'],
    row.Désignation,
    row['Désignation 2'],
    row.Emballage,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  if (/surgel|tiefkuhl|congel|deep.?frozen|surgeles/.test(blob)) {
    return 'surgeles'
  }

  if (
    /emballage|verpackung|emballages|hygiene prof|nettoyage prof|sacs? |carton|film etirable|barquette vide|gobelet/.test(blob)
    || /\b(emballages?|consommables)\b/.test(blob)
  ) {
    return 'emballages'
  }

  if (
    /viande|charcut|volaille|boeuf|bœuf|porc|poulet|agneau|veau|canard|dinde|lapin|fleisch|wurst/.test(blob)
    && !/surgel|congel/.test(blob)
  ) {
    return 'viandes'
  }

  return 'general'
}

export function splitBiopartnerRows(rows: BiopartnerRow[]): Record<BiopartnerCatalogKey, BiopartnerRow[]> {
  const result: Record<BiopartnerCatalogKey, BiopartnerRow[]> = {
    general: [],
    emballages: [],
    surgeles: [],
    viandes: [],
  }

  for (const row of rows) {
    result[classifyBiopartnerRow(row)].push(row)
  }

  return result
}
