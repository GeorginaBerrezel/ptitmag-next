/** Règles de prix effectif (Ciel +20 %, Biopartner UC +10 %). */

export const CIEL_MARKUP_FACTOR = 1.2
/** @deprecated Préférer CIEL_MARKUP_FACTOR */
export const TRIAL_MARKUP_FACTOR = CIEL_MARKUP_FACTOR
export const UC_SURCHARGE_FACTOR = 1.1

export type PriceInput = {
  unitPrice: number
  minQuantity: number
  allowsPartialOrder: boolean
  quantity: number
}

export type PricingOptions = {
  /** Membre Ciel → +20 % sur le prix catalogue. */
  applyCielMarkup?: boolean
  /** @deprecated Préférer applyCielMarkup */
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

  const markup = options?.applyCielMarkup ?? options?.applyTrialMarkup

  if (markup) {
    price *= CIEL_MARKUP_FACTOR
  }

  if (item.allowsPartialOrder && item.quantity < item.minQuantity) {
    price *= UC_SURCHARGE_FACTOR
  }

  return price
}

export function hasUcSurcharge(item: Pick<PriceInput, 'allowsPartialOrder' | 'minQuantity' | 'quantity'>): boolean {
  return item.allowsPartialOrder && item.quantity < item.minQuantity
}
