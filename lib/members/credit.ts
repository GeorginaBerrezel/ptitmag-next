/** Avoir membre (CHF) — solde admin, déduction à la commande. */

export function roundChf(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function parseCreditBalance(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (Number.isNaN(n) || n < 0) return null
  return roundChf(n)
}

/** Répartit l'avoir sur plusieurs sous-totaux (une commande par fournisseur). */
export function allocateCreditAcrossTotals(
  subtotals: number[],
  available: number,
): number[] {
  let remaining = roundChf(Math.max(0, available))
  return subtotals.map(subtotal => {
    const gross = roundChf(subtotal)
    if (remaining <= 0 || gross <= 0) return 0
    const applied = roundChf(Math.min(remaining, gross))
    remaining = roundChf(remaining - applied)
    return applied
  })
}

export function formatCreditChf(amount: number): string {
  return `CHF ${roundChf(amount).toFixed(2)}`
}
