/** Taux TVA Biopartner (colonne Z du fichier — libellé « TVA »). */

export const VAT_REDUCED_MULTIPLIER = 1.026
export const VAT_STANDARD_MULTIPLIER = 1.081

/** Multiplicateur HT → TTC selon le libellé colonne TVA (ex. « Taux TVA normal 8.1% »). */
export function vatMultiplierFromLabel(tva: string | undefined): number {
  const label = (tva ?? '').toLowerCase()
  if (label.includes('8.1') || label.includes('8,1') || label.includes('normal')) {
    return VAT_STANDARD_MULTIPLIER
  }
  return VAT_REDUCED_MULTIPLIER
}
