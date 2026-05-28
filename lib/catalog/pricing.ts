/** Règles de prix effectif (majoration non cotisé +20 %, Biopartner UC +10 %). */

export const TRIAL_MARKUP_FACTOR = 1.2
export const UC_SURCHARGE_FACTOR = 1.1

export type PriceInput = {
  unitPrice: number
  minQuantity: number
  allowsPartialOrder: boolean
  quantity: number
}

export type PricingOptions = {
  /** Membre non cotisé (trial) → +20 % sur le prix catalogue. */
  applyTrialMarkup?: boolean
}

/**
 * Prix unitaire effectif selon statut membre et quantité.
 * Ordre : prix catalogue → ×1,2 si non cotisé → ×1,1 si qté &lt; UC Biopartner.
 */
export function getEffectiveUnitPrice(
  item: PriceInput,
  options?: PricingOptions,
): number {
  let price = item.unitPrice

  if (options?.applyTrialMarkup) {
    price *= TRIAL_MARKUP_FACTOR
  }

  if (item.allowsPartialOrder && item.quantity < item.minQuantity) {
    price *= UC_SURCHARGE_FACTOR
  }

  return price
}

export function hasUcSurcharge(item: Pick<PriceInput, 'allowsPartialOrder' | 'minQuantity' | 'quantity'>): boolean {
  return item.allowsPartialOrder && item.quantity < item.minQuantity
}
