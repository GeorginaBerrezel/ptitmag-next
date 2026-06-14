/** Règles de prix effectif (Ciel +20 %, Biopartner UC +10 %). */

import { ceilToCentime } from '@/lib/catalog/money'

export const CIEL_MARKUP_FACTOR = 1.2
export { ceilToCentime } from '@/lib/catalog/money'
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
 * Ordre : prix catalogue TTC → ×1,2 Ciel (arrondi sup.) → ×1,1 UC (arrondi sup.).
 */
export function getEffectiveUnitPrice(
  item: PriceInput,
  options?: PricingOptions,
): number {
  let price = ceilToCentime(item.unitPrice)

  const markup = options?.applyCielMarkup ?? options?.applyTrialMarkup

  if (markup) {
    price = ceilToCentime(price * CIEL_MARKUP_FACTOR)
  }

  if (item.allowsPartialOrder && item.quantity < item.minQuantity) {
    price = ceilToCentime(price * UC_SURCHARGE_FACTOR)
  }

  return price
}

export function hasUcSurcharge(item: Pick<PriceInput, 'allowsPartialOrder' | 'minQuantity' | 'quantity'>): boolean {
  return item.allowsPartialOrder && item.quantity < item.minQuantity
}
