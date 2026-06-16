import { roundChf } from '@/lib/members/credit'

export type ClosureBaselineFields = {
  quantity: number
  unit_price: number
  closure_baseline_quantity?: number | null
  closure_baseline_unit_price?: number | null
}

export function orderItemHasClosureBaseline(item: ClosureBaselineFields): boolean {
  return (
    item.closure_baseline_quantity != null &&
    item.closure_baseline_unit_price != null
  )
}

/** True si la ligne diffère du snapshot « commande livrée » (1er edit admin). */
export function orderItemClosureModified(item: ClosureBaselineFields): boolean {
  if (!orderItemHasClosureBaseline(item)) return false
  return (
    roundChf(item.quantity) !== roundChf(Number(item.closure_baseline_quantity)) ||
    roundChf(item.unit_price) !== roundChf(Number(item.closure_baseline_unit_price))
  )
}

export function formatClosureBaselineLabel(
  quantity: number,
  unitPrice: number,
  unit: string,
): string {
  const qtyLabel = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2).replace(/\.?0+$/, '')
  const unitLabel = unit.trim() || 'unité'
  return `${qtyLabel} ${unitLabel} × CHF ${roundChf(unitPrice).toFixed(2)}`
}
