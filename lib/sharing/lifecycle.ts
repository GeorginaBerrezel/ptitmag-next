/** Aligné sur share_apply_deadlines() : report = +7 jours jusqu’à une date future. */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ROLLS = 52

export function rollShareDeadline(fromIso: string, now = new Date()): string {
  let next = new Date(fromIso).getTime()
  if (!Number.isFinite(next)) return fromIso
  let guard = 0
  while (next <= now.getTime() && guard < MAX_ROLLS) {
    next += WEEK_MS
    guard++
  }
  return new Date(next).toISOString()
}

export function isShareDeadlinePassed(deadlineIso: string | null | undefined, now = new Date()): boolean {
  if (!deadlineIso) return false
  const t = new Date(deadlineIso).getTime()
  return Number.isFinite(t) && t <= now.getTime()
}
