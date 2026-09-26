import { roundQty } from './pool-math'

export type CoverInput = {
  memberId: string
  quantity: number
  coverMax: number | null
  /** Moment où la personne a coché. L’ordre de ces dates départage. */
  coverAt: string | null
}

export type CoverPick = {
  memberId: string
  nextQuantity: number
}

/** La première personne dont le maximum couvre tout le trou. Pas de partage du reste. */
export function pickCover(
  contributions: CoverInput[],
  target: number,
): CoverPick | null {
  const filled = roundQty(contributions.reduce((sum, row) => sum + row.quantity, 0))
  const remaining = roundQty(target - filled)
  if (remaining <= 1e-9) return null

  const volunteers = contributions
    .filter(row => canAbsorbGap(row, remaining))
    .sort((a, b) => {
      const byTime = (a.coverAt ?? '').localeCompare(b.coverAt ?? '')
      if (byTime !== 0) return byTime
      return a.memberId.localeCompare(b.memberId)
    })

  const first = volunteers[0]
  if (!first || first.coverMax == null) return null
  return {
    memberId: first.memberId,
    nextQuantity: roundQty(first.quantity + remaining),
  }
}

export function canAbsorbGap(row: CoverInput, remaining: number): boolean {
  if (row.coverMax == null || !row.coverAt) return false
  if (remaining <= 1e-9) return false
  return row.coverMax + 1e-9 >= row.quantity + remaining
}

export function normalizeCoverMax(
  raw: number | null,
  quantity: number,
  target: number,
  step: number,
): { ok: true; coverMax: number | null } | { ok: false; error: 'too_small' | 'too_big' } {
  if (raw == null) return { ok: true, coverMax: null }
  if (!Number.isFinite(raw) || raw > target + 1e-9) return { ok: false, error: 'too_big' }

  const steps = Math.round((raw - quantity) / step)
  const snapped = roundQty(quantity + steps * step)
  if (snapped <= quantity + 1e-9) return { ok: false, error: 'too_small' }
  if (snapped > target + 1e-9) return { ok: false, error: 'too_big' }
  return { ok: true, coverMax: snapped }
}

/** Assez pour finir le carton tel qu’il est. S’il est déjà plein : une part de plus. */
export function defaultCoverMax(
  quantity: number,
  remaining: number,
  target: number,
  step: number,
): number {
  const wanted = remaining > 1e-9
    ? Math.min(target, roundQty(quantity + remaining))
    : roundQty(quantity + step)
  const norm = normalizeCoverMax(wanted, quantity, target, step)
  if (norm.ok && norm.coverMax != null) return norm.coverMax
  return Math.min(target, roundQty(quantity + step))
}
