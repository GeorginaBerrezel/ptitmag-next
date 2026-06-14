import { CIEL_MARKUP_FACTOR, ceilToCentime } from '@/lib/catalog/pricing'

export type CielPriceBreakdown = {
  basePrice: number
  effectivePrice: number
  markupAmount: number
}

/** Détail prix Ciel : base Terre + majoration incluse dans le prix affiché. */
export function getCielPriceBreakdown(baseUnitPrice: number): CielPriceBreakdown {
  const basePrice = ceilToCentime(baseUnitPrice)
  const effectivePrice = ceilToCentime(baseUnitPrice * CIEL_MARKUP_FACTOR)
  const markupAmount = ceilToCentime(effectivePrice - basePrice)
  return { basePrice, effectivePrice, markupAmount }
}
