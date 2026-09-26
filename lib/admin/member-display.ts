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

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** Date civile à St-Romain : année, mois (1–12), jour. */
export function zurichYmd(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = new Date(iso)
    .toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' })
    .split('-')
    .map(Number)
  return { y, m, d }
}

/** Lundi (YYYY-MM-DD) de la semaine civile à Zurich. */
export function zurichWeekStart(iso: string): string {
  const { y, m, d } = zurichYmd(iso)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const weekday = utc.getUTCDay()
  const delta = weekday === 0 ? -6 : 1 - weekday
  utc.setUTCDate(utc.getUTCDate() + delta)
  const yy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function closureMoment(order: { closed_at?: string | null; created_at: string }): string {
  return order.closed_at || order.created_at
}

/** Lundi de la semaine de clôture la plus récente. */
export function latestClosureWeekStart(
  orders: Array<{ closed_at?: string | null; created_at: string }>,
): string | null {
  if (orders.length === 0) return null
  return orders.reduce((max, order) => {
    const start = zurichWeekStart(closureMoment(order))
    return start > max ? start : max
  }, '')
}

export function isInClosureWeek(
  order: { closed_at?: string | null; created_at: string },
  weekStart: string,
): boolean {
  return zurichWeekStart(closureMoment(order)) === weekStart
}

/** « sept. 2026 » ou « juin → sept. 2026 », d’après la date de commande. */
export function formatMonthSpan(isos: string[]): string {
  if (isos.length === 0) return ''
  const keys = isos.map(iso => {
    const { y, m } = zurichYmd(iso)
    return y * 12 + (m - 1)
  })
  const min = Math.min(...keys)
  const max = Math.max(...keys)
  const label = (key: number) => {
    const y = Math.floor(key / 12)
    const m = key % 12
    return `${MONTHS_SHORT[m]} ${y}`
  }
  if (min === max) return label(min)
  const sameYear = Math.floor(min / 12) === Math.floor(max / 12)
  if (sameYear) return `${MONTHS_SHORT[min % 12]} → ${label(max)}`
  return `${label(min)} → ${label(max)}`
}

/** Titre de mois pour une liste triée par date. */
export function formatMonthHeading(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  })
}

/** Regroupe les commandes par membre.
 *  supplier : alphabétique fournisseur, puis date (onglets de la semaine).
 *  recent : date de commande la plus récente en premier (clôturées, historique).
 */
export function groupOrdersByMember<T extends { member_id: string; created_at: string; supplier?: { name: string } | null }>(
  orders: T[],
  getMemberName: (order: T) => string,
  getMemberEmail: (order: T) => string | null,
  sortBy: 'supplier' | 'recent' = 'supplier',
): MemberOrderGroup<T>[] {
  const sorted = [...orders].sort((a, b) => {
    const byMember = compareMemberDisplayNames(getMemberName(a), getMemberName(b))
    if (byMember !== 0) return byMember
    if (sortBy === 'recent') return b.created_at.localeCompare(a.created_at)
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
