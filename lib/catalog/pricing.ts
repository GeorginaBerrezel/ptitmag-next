/** Règles de prix effectif (majoration Biopartner +10 %). */

export type PriceInput = {
  unitPrice: number
  minQuantity: number
  allowsPartialOrder: boolean
  quantity: number
}

/**
 * Prix unitaire effectif selon la quantité.
 * Si qty < minQuantity et allowsPartialOrder → +10 % de majoration.
 */
export function getEffectiveUnitPrice(item: PriceInput): number {
  if (item.allowsPartialOrder && item.quantity < item.minQuantity) {
    return item.unitPrice * 1.1
  }
  return item.unitPrice
}
