/** Règles de quantité : Biopartner (UC entier), Bioterroir (0,25 kg), défaut (entiers). */

import { BIOTERROIR_KG_STEP } from '@/lib/catalog/bioterroir-quantity'

export type QuantityRules = {
  minQuantity: number
  allowsPartialOrder: boolean
}

/** Pas de 0,25 kg (ou autre fraction < 1). */
export function usesFractionalStep(rules: QuantityRules): boolean {
  return rules.minQuantity > 0 && rules.minQuantity < 1
}

function quantityStep(rules: QuantityRules): number {
  if (usesFractionalStep(rules)) return rules.minQuantity
  return Math.max(1, rules.minQuantity)
}

function roundToStep(value: number, step: number): number {
  const rounded = Math.round(value / step) * step
  const decimals = step < 1 ? 2 : 0
  return Number(rounded.toFixed(decimals))
}

export function getMinAllowedQuantity(rules: QuantityRules): number {
  if (usesFractionalStep(rules)) return rules.minQuantity
  const min = Math.max(1, rules.minQuantity)
  return rules.allowsPartialOrder ? 1 : min
}

export function incrementQuantity(qty: number, rules: QuantityRules): number {
  const step = quantityStep(rules)
  if (usesFractionalStep(rules)) {
    return roundToStep(qty + step, step)
  }
  const min = Math.max(1, rules.minQuantity)
  if (min <= 1) return qty + 1
  if (qty < min) return qty + 1
  return qty + min
}

export function decrementQuantity(qty: number, rules: QuantityRules): number {
  const minAllowed = getMinAllowedQuantity(rules)
  const step = quantityStep(rules)
  if (qty <= minAllowed) return qty
  if (usesFractionalStep(rules)) {
    return roundToStep(Math.max(minAllowed, qty - step), step)
  }
  const min = Math.max(1, rules.minQuantity)
  if (min <= 1) return qty - 1
  if (qty > min) return qty - min
  return qty - 1
}

export function normalizeQuantity(qty: number, rules: QuantityRules): number {
  const minAllowed = getMinAllowedQuantity(rules)
  const step = quantityStep(rules)
  if (qty < minAllowed) return minAllowed
  if (usesFractionalStep(rules)) {
    return roundToStep(qty, step)
  }
  const min = Math.max(1, rules.minQuantity)
  if (min <= 1) return qty
  if (qty < min) return qty
  const floored = Math.floor(qty / min) * min
  return floored >= min ? floored : min
}

export function formatQuantityDisplay(qty: number, rules: QuantityRules): string {
  if (usesFractionalStep(rules)) {
    const rounded = roundToStep(qty, rules.minQuantity)
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, '')
  }
  return String(qty)
}

export function quantityHintText(rules: QuantityRules, unit: string): string {
  if (usesFractionalStep(rules)) {
    const step = BIOTERROIR_KG_STEP
    return `par ${step} ${unit} (ex. ${step}, ${step * 2}, ${step * 3}, 1…)`
  }
  const min = Math.max(1, rules.minQuantity)
  if (rules.allowsPartialOrder && min > 1) {
    return `min. sans majoration : ${min} ${unit} (ou moins avec +10 %)`
  }
  if (min > 1) {
    return `par ${min} ${unit} (ex. ${min}, ${min * 2}, ${min * 3}…)`
  }
  return `minimum : ${min} ${unit}`
}
