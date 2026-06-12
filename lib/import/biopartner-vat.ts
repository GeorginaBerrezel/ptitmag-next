/** Taux TVA Biopartner (colonne Z du fichier — libellé « TVA »). */

export const VAT_REDUCED_MULTIPLIER = 1.026
export const VAT_STANDARD_MULTIPLIER = 1.081

/** Multiplicateur HT → TTC selon le libellé colonne TVA (ex. « Taux TVA normal 8.1% »). */
export function vatMultiplierFromLabel(tva: string | undefined): number {
  const label = (tva ?? '').toLowerCase().trim()
  if (
    label.includes('8.1') ||
    label.includes('8,1') ||
    label.includes('810') ||
    label.includes('normal') ||
    label.includes('normale')
  ) {
    return VAT_STANDARD_MULTIPLIER
  }
  if (
    label.includes('2.6') ||
    label.includes('2,6') ||
    label.includes('260') ||
    label.includes('réduit') ||
    label.includes('reduit') ||
    label.includes('reduced')
  ) {
    return VAT_REDUCED_MULTIPLIER
  }
  return VAT_REDUCED_MULTIPLIER
}

/** TVA pour une ligne Biopartner : libellé colonne Z, ou repère n° article (2… = alimentaire). */
export function vatMultiplierForRow(article: string, tva: string | undefined): number {
  if ((tva ?? '').trim()) return vatMultiplierFromLabel(tva)
  const ref = article.trim()
  if (/^2/.test(ref)) return VAT_REDUCED_MULTIPLIER
  return VAT_STANDARD_MULTIPLIER
}
