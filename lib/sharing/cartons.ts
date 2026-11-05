/** Numérote les cartons d’un même produit : le plus ancien est le carton 1. */

export function assignCartonNumbers<T extends { id: string; productId: string; createdAt: string }>(
  rows: T[],
): Map<string, number> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const list = groups.get(row.productId) ?? []
    list.push(row)
    groups.set(row.productId, list)
  }

  const numbers = new Map<string, number>()
  for (const list of groups.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    list.forEach((row, index) => numbers.set(row.id, index + 1))
  }
  return numbers
}
