import { pickCover, type CoverInput } from './cover'
import { isPoolFull, roundQty } from './pool-math'

export type SettleContribution = CoverInput & {
  ordered: boolean
}

export type SettlePlanInput = {
  now: Date
  status: 'open' | 'ready' | 'deferred'
  deadlineAt: string
  target: number
  contributions: SettleContribution[]
  productActive: boolean
  supplierActive: boolean
  supplierOrdersOpen: boolean
  supplierDeadlineAt: string | null
}

export type SettleQuantity = {
  memberId: string
  quantity: number
}

export type SettlePlan =
  | { type: 'wait' }
  | { type: 'order'; quantities: SettleQuantity[] }
  | { type: 'defer' }
  | { type: 'reopen'; deadlineAt: string; full: boolean }
  | { type: 'sync-deadline'; deadlineAt: string }
  | { type: 'cancel'; reason: 'product' | 'supplier' }

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

function futureSupplierDeadline(input: SettlePlanInput): string | null {
  const deadline = input.supplierDeadlineAt
  const t = ms(deadline)
  if (!input.supplierOrdersOpen || !deadline || t == null) return null
  if (t <= input.now.getTime()) return null
  return deadline
}

function orderQuantities(input: SettlePlanInput): SettleQuantity[] {
  const unordered = input.contributions.filter(row => !row.ordered)
  const pick = input.contributions.some(row => row.ordered)
    ? null
    : pickCover(input.contributions, input.target)

  return unordered.map(row => ({
    memberId: row.memberId,
    quantity: pick && pick.memberId === row.memberId ? pick.nextQuantity : row.quantity,
  }))
}

function filled(contributions: SettleContribution[]): number {
  return roundQty(contributions.reduce((sum, row) => sum + row.quantity, 0))
}

/** Décide une seule action. Le report suit la prochaine ouverture du fournisseur. */
export function planShareSettle(input: SettlePlanInput): SettlePlan {
  if (!input.productActive) return { type: 'cancel', reason: 'product' }
  if (!input.supplierActive) return { type: 'cancel', reason: 'supplier' }

  const deadlinePassed = (ms(input.deadlineAt) ?? 0) <= input.now.getTime()
  const full = isPoolFull(input.target, filled(input.contributions))
  const legacyOrdered = input.contributions.some(row => row.ordered)

  if (legacyOrdered) {
    if (deadlinePassed && full) return { type: 'order', quantities: orderQuantities(input) }
    return { type: 'wait' }
  }

  if (input.status === 'deferred') {
    const next = futureSupplierDeadline(input)
    if (!next) return { type: 'wait' }
    return { type: 'reopen', deadlineAt: next, full }
  }

  if (!deadlinePassed) {
    const next = futureSupplierDeadline(input)
    if (next && next !== input.deadlineAt) return { type: 'sync-deadline', deadlineAt: next }
    return { type: 'wait' }
  }

  if (full || pickCover(input.contributions, input.target)) {
    return { type: 'order', quantities: orderQuantities(input) }
  }

  return { type: 'defer' }
}
