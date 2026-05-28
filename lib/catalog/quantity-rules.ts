/** Règles de quantité Biopartner (UC) : minimum, pas de 3/6/9, commande partielle. */

export type QuantityRules = {
  minQuantity: number
  allowsPartialOrder: boolean
}

export function getMinAllowedQuantity({ minQuantity, allowsPartialOrder }: QuantityRules): number {
  const min = Math.max(1, minQuantity)
  return allowsPartialOrder ? 1 : min
}

/**
 * Quantités valides au-dessus du minimum UC : multiples de UC (3 → 3, 6, 9…).
 * En dessous de UC, si commande partielle autorisée : 1, 2… avec majoration +10 %.
 */
export function incrementQuantity(qty: number, rules: QuantityRules): number {
  const min = Math.max(1, rules.minQuantity)
  if (min <= 1) return qty + 1
  if (qty < min) return qty + 1
  return qty + min
}

export function decrementQuantity(qty: number, rules: QuantityRules): number {
  const minAllowed = getMinAllowedQuantity(rules)
  const min = Math.max(1, rules.minQuantity)
  if (qty <= minAllowed) return qty
  if (min <= 1) return qty - 1
  if (qty > min) return qty - min
  return qty - 1
}

/** Ramène une quantité hors limites vers la valeur valide la plus proche. */
export function normalizeQuantity(qty: number, rules: QuantityRules): number {
  const minAllowed = getMinAllowedQuantity(rules)
  const min = Math.max(1, rules.minQuantity)
  if (qty < minAllowed) return minAllowed
  if (min <= 1) return qty
  if (qty < min) return qty
  const floored = Math.floor(qty / min) * min
  return floored >= min ? floored : min
}

export function quantityHintText(rules: QuantityRules, unit: string): string {
  const min = Math.max(1, rules.minQuantity)
  if (rules.allowsPartialOrder && min > 1) {
    return `min. sans majoration : ${min} ${unit} (ou moins avec +10 %)`
  }
  if (min > 1) {
    return `par ${min} ${unit} (ex. ${min}, ${min * 2}, ${min * 3}…)`
  }
  return `minimum : ${min} ${unit}`
}
