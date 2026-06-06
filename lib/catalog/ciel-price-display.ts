import { CIEL_MARKUP_FACTOR } from '@/lib/catalog/pricing'

export type CielPriceBreakdown = {
  basePrice: number
  effectivePrice: number
  markupAmount: number
}

/** Détail prix Ciel : base Terre + majoration incluse dans le prix affiché. */
export function getCielPriceBreakdown(baseUnitPrice: number): CielPriceBreakdown {
  const basePrice = Math.round(baseUnitPrice * 100) / 100
  const effectivePrice = Math.round(baseUnitPrice * CIEL_MARKUP_FACTOR * 100) / 100
  const markupAmount = Math.round((effectivePrice - basePrice) * 100) / 100
  return { basePrice, effectivePrice, markupAmount }
}
