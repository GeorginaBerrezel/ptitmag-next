/** Arrondi au centime supérieur (CHF) — règle Joel / Biopartner. */
export function ceilToCentime(amount: number): number {
  return Math.ceil(Math.round(amount * 1000) / 10) / 100
}
