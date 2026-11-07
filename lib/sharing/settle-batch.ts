/** Regroupe des lignes de clôture. Une commande = une personne + un fournisseur. */

export function groupByMemberSupplier<T extends { memberId: string; supplierId: string }>(lines: T[]): T[][] {
  const groups = new Map<string, T[]>()
  for (const line of lines) {
    const key = `${line.memberId}\0${line.supplierId}`
    const list = groups.get(key) ?? []
    list.push(line)
    groups.set(key, list)
  }
  return [...groups.values()]
}

/**
 * Si une commande contient un carton raté, tous ses cartons sont ratés :
 * on ne laisse pas une moitié de carton commandée.
 */
export function expandFailedPools(
  orders: Array<{ poolIds: string[] }>,
  failed: Iterable<string>,
): Set<string> {
  const out = new Set(failed)
  let grew = true
  while (grew) {
    grew = false
    for (const order of orders) {
      if (!order.poolIds.some(id => out.has(id))) continue
      for (const id of order.poolIds) {
        if (out.has(id)) continue
        out.add(id)
        grew = true
      }
    }
  }
  return out
}
