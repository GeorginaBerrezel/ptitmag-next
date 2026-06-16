import { allocateCreditAcrossTotals, roundChf } from '@/lib/members/credit'

export type OrderCreditInput = {
  grossTotal: number
  storedCredit: number
}

export type MemberCloseCreditPlan = {
  creditPerOrder: number[]
  totalCreditApplied: number
  totalGross: number
  totalPayable: number
  balanceAfter: number
}

/**
 * Calcule l'avoir à appliquer sur chaque commande lors d'une clôture groupée membre.
 * L'avoir disponible est déduit une seule fois sur le total membre (pas commande par commande).
 * Les commandes legacy (credit_applied > 0 à la confirmation) conservent leur logique d'ajustement.
 */
export function computeMemberCloseCredits(
  orders: OrderCreditInput[],
  initialBalance: number,
): MemberCloseCreditPlan {
  let balance = roundChf(initialBalance)
  const creditPerOrder: number[] = []
  const newFlowSubtotals: number[] = []
  const newFlowIndices: number[] = []

  for (let i = 0; i < orders.length; i++) {
    const grossTotal = roundChf(orders[i].grossTotal)
    const stored = roundChf(orders[i].storedCredit)

    if (stored > 0) {
      const applied = roundChf(Math.min(stored, grossTotal))
      const excess = roundChf(stored - applied)
      if (excess > 0) balance = roundChf(balance + excess)
      creditPerOrder.push(applied)
    } else {
      creditPerOrder.push(0)
      newFlowIndices.push(i)
      newFlowSubtotals.push(grossTotal)
    }
  }

  const newFlowGross = roundChf(newFlowSubtotals.reduce((s, g) => s + g, 0))
  const allocatable = roundChf(Math.min(balance, newFlowGross))
  const allocated = allocateCreditAcrossTotals(newFlowSubtotals, allocatable)
  balance = roundChf(balance - allocatable)

  for (let j = 0; j < newFlowIndices.length; j++) {
    creditPerOrder[newFlowIndices[j]] = allocated[j]
  }

  const totalGross = roundChf(orders.reduce((s, o) => s + roundChf(o.grossTotal), 0))
  const totalCreditApplied = roundChf(creditPerOrder.reduce((s, c) => s + c, 0))
  const totalPayable = roundChf(totalGross - totalCreditApplied)

  return {
    creditPerOrder,
    totalCreditApplied,
    totalGross,
    totalPayable,
    balanceAfter: balance,
  }
}
