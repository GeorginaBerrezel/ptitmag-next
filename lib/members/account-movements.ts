import { getSupplierDisplayName } from '@/lib/catalog/supplier-info'
import { formatCreditChf, roundChf } from '@/lib/members/credit'
import {
  orderCreditApplied,
  orderGrossFromStored,
  orderGrossTotal,
} from '@/lib/orders/order-totals-display'
import type { OrderWithItems } from '@/lib/supabase/auth'

export type AccountMovementKind = 'achat' | 'en_cours'

export type AccountMovement = {
  id: string
  date: string
  kind: AccountMovementKind
  supplierLabel: string
  gross: number
  credit: number
  payable: number
}

export type AccountStatement = {
  creditBalance: number
  movements: AccountMovement[]
  closedGross: number
  closedCredit: number
  closedPayable: number
  closedCount: number
  inProgressGross: number
  inProgressCount: number
}

const IN_PROGRESS = new Set(['confirmed', 'delivered', 'draft'])

function supplierLabel(order: OrderWithItems): string {
  const name = order.supplier?.name ?? 'Fournisseur'
  return getSupplierDisplayName(name, order.supplier?.type)
}

function movementFromClosed(order: OrderWithItems): AccountMovement {
  const credit = orderCreditApplied(order.credit_applied)
  const payable = roundChf(Number(order.total) || 0)
  const gross = credit > 0
    ? orderGrossFromStored(payable, credit)
    : orderGrossTotal(order.order_items)
  return {
    id: order.id,
    date: order.closed_at ?? order.created_at,
    kind: 'achat',
    supplierLabel: supplierLabel(order),
    gross,
    credit,
    payable,
  }
}

function movementFromInProgress(order: OrderWithItems): AccountMovement {
  const gross = orderGrossTotal(order.order_items)
  return {
    id: order.id,
    date: order.created_at,
    kind: 'en_cours',
    supplierLabel: supplierLabel(order),
    gross,
    credit: 0,
    payable: gross,
  }
}

/** Relevé membre à partir des commandes + solde d’avoir actuel (pas de versements). */
export function buildAccountStatement(
  orders: OrderWithItems[],
  creditBalance: number,
): AccountStatement {
  const closed: AccountMovement[] = []
  const inProgress: AccountMovement[] = []

  for (const order of orders) {
    if (order.status === 'closed') closed.push(movementFromClosed(order))
    else if (IN_PROGRESS.has(order.status)) inProgress.push(movementFromInProgress(order))
  }

  const byDateDesc = (a: AccountMovement, b: AccountMovement) =>
    b.date.localeCompare(a.date) || a.supplierLabel.localeCompare(b.supplierLabel, 'fr')

  const movements = [...closed, ...inProgress].sort(byDateDesc)

  return {
    creditBalance: roundChf(Math.max(0, creditBalance)),
    movements,
    closedGross: roundChf(closed.reduce((s, m) => s + m.gross, 0)),
    closedCredit: roundChf(closed.reduce((s, m) => s + m.credit, 0)),
    closedPayable: roundChf(closed.reduce((s, m) => s + m.payable, 0)),
    closedCount: closed.length,
    inProgressGross: roundChf(inProgress.reduce((s, m) => s + m.gross, 0)),
    inProgressCount: inProgress.length,
  }
}

export function formatMovementAmount(amount: number): string {
  return formatCreditChf(amount)
}

export function movementKindLabel(kind: AccountMovementKind): string {
  return kind === 'achat' ? 'Achat clôturé' : 'En cours'
}
