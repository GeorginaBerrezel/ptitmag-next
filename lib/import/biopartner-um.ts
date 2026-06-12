/** UM Biopartner : 0 = prix HT (+ TVA), ≥ 1 = prix déjà TTC. */

export function isBiopartnerPriceTtc(um: string | undefined): boolean {
  const raw = (um ?? '').trim().replace(',', '.')
  if (!raw) return false
  const n = parseFloat(raw)
  return !Number.isNaN(n) && n >= 1
}
