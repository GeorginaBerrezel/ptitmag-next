/** Nom affiché et tri alphabétique — pages admin membres / commandes. */

export type MemberNameFields = {
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  username?: string | null
  email?: string | null
}

export function getMemberDisplayName(fields: MemberNameFields): string {
  const fromParts = [fields.first_name, fields.last_name].filter(Boolean).join(' ').trim()
  return (
    fromParts ||
    fields.full_name ||
    fields.username ||
    fields.email?.split('@')[0] ||
    'Membre inconnu'
  )
}

export function compareMemberDisplayNames(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' })
}

export function sortByMemberDisplayName<T>(items: T[], getName: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareMemberDisplayNames(getName(a), getName(b)))
}

export type MemberOrderGroup<T> = {
  memberId: string
  memberName: string
  memberEmail: string | null
  orders: T[]
}

/** Somme des totaux commandes (affichage récap membre). */
export function sumOrderTotals<T extends { total?: number | null }>(orders: T[]): number {
  return orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
}

/** Regroupe les commandes par membre, tri alphabétique membre puis fournisseur. */
export function groupOrdersByMember<T extends { member_id: string; created_at: string; supplier?: { name: string } | null }>(
  orders: T[],
  getMemberName: (order: T) => string,
  getMemberEmail: (order: T) => string | null,
): MemberOrderGroup<T>[] {
  const sorted = [...orders].sort((a, b) => {
    const byMember = compareMemberDisplayNames(getMemberName(a), getMemberName(b))
    if (byMember !== 0) return byMember
    const bySupplier = (a.supplier?.name ?? '').localeCompare(b.supplier?.name ?? '', 'fr', {
      sensitivity: 'base',
    })
    if (bySupplier !== 0) return bySupplier
    return b.created_at.localeCompare(a.created_at)
  })

  const groups: MemberOrderGroup<T>[] = []
  for (const order of sorted) {
    const memberName = getMemberName(order)
    const last = groups[groups.length - 1]
    if (last && last.memberId === order.member_id) {
      last.orders.push(order)
    } else {
      groups.push({
        memberId: order.member_id,
        memberName,
        memberEmail: getMemberEmail(order),
        orders: [order],
      })
    }
  }
  return groups
}
