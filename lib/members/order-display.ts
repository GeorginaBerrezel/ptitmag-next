/** Tri d’affichage : inachevés d’abord, puis fournisseur, puis semaine. */

export type SortableOrder = {
  id: string
  createdAt: string
  supplierName: string
  /** Toutes les lignes sont cochées « récupéré ». */
  complete: boolean
}

export type OrderDisplayGroup = {
  key: string
  title: string | null
  orderIds: string[]
}

export function weekKeyInZurich(iso: string): string {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
  const [year, month, day] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  const weekday = utc.getUTCDay()
  const shift = weekday === 0 ? -6 : 1 - weekday
  utc.setUTCDate(utc.getUTCDate() + shift)
  return utc.toISOString().slice(0, 10)
}

export function weekTitle(weekKey: string): string {
  const [year, month, day] = weekKey.split('-').map(Number)
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-CH', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return `Semaine du ${label}`
}

export function groupOrdersForDisplay(orders: SortableOrder[]): OrderDisplayGroup[] {
  const buckets = new Map<string, SortableOrder[]>()
  for (const order of orders) {
    const week = weekKeyInZurich(order.createdAt)
    const flag = order.complete ? '1' : '0'
    const key = `${flag}\0${order.supplierName}\0${week}`
    const list = buckets.get(key) ?? []
    list.push(order)
    buckets.set(key, list)
  }

  const groups = [...buckets.entries()].map(([key, list]) => {
    const [flag, supplierName, week] = key.split('\0')
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    return {
      key,
      flag,
      supplierName,
      week,
      title: sorted.length > 1 ? `${supplierName} · ${weekTitle(week)}` : null,
      orderIds: sorted.map(order => order.id),
    }
  })

  groups.sort((a, b) => {
    if (a.flag !== b.flag) return a.flag < b.flag ? -1 : 1
    const byName = a.supplierName.localeCompare(b.supplierName, 'fr')
    if (byName !== 0) return byName
    return b.week.localeCompare(a.week)
  })

  return groups.map(({ key, title, orderIds }) => ({ key, title, orderIds }))
}
