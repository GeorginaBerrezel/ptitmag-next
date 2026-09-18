import type { ShareContribution, ShareProduct } from './types'
import { getSharePlan, SHARE_MESSAGES } from './eligibility'

export function shareTargetOf(product: ShareProduct): number {
  if (product.shareTarget && product.shareTarget > 0) return product.shareTarget
  const plan = getSharePlan(product)
  return plan?.target ?? product.minQuantity
}

export function shareStepOf(product: ShareProduct): number {
  if (product.shareStep && product.shareStep > 0) return product.shareStep
  const plan = getSharePlan(product)
  return plan?.step ?? 1
}

export function poolFilled(contributions: ShareContribution[]): number {
  return contributions.reduce((sum, row) => sum + row.quantity, 0)
}

export function poolRemaining(target: number, filled: number): number {
  return Math.max(0, roundQty(target - filled))
}

export function isPoolFull(target: number, filled: number): boolean {
  return filled >= target - 1e-9
}

export function clampJoinQuantity(wanted: number, remaining: number, step = 1): number {
  if (remaining <= 0) return 0
  const qty = roundQty(wanted)
  if (!Number.isFinite(qty) || qty < step - 1e-9) return 0
  return Math.min(qty, remaining)
}

export function defaultShareQuantity(step: number): number {
  return step
}

export function wouldTakeWholeCarton(quantity: number, target: number): boolean {
  return quantity >= target - 1e-9
}

export function maxOpenShareQuantity(target: number, step: number): number {
  return Math.max(step, roundQty(target - step))
}

export function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000
}

export const WHOLE_CARTON_MESSAGE = SHARE_MESSAGES.wholeCarton
