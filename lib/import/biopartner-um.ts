/** UM Biopartner : 0 = minimum strict · ≥ 1 = commande partielle possible si UC > 1. */

export function isBiopartnerPriceTtc(um: string | undefined): boolean {
  const raw = (um ?? '').trim().replace(',', '.')
  if (!raw) return false
  const n = parseFloat(raw)
  return !Number.isNaN(n) && n >= 1
}
